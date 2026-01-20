import React, { useState, useRef } from 'react';
import { BabyProfile, GrowthMeasurement } from './types';

interface RosieProfileProps {
  baby: BabyProfile;
  growthMeasurements: GrowthMeasurement[];
  onUpdateBaby: (baby: BabyProfile) => void;
  onAddMeasurement: (measurement: Omit<GrowthMeasurement, 'id' | 'timestamp'>) => void;
  onDeleteMeasurement: (id: string) => void;
  onClose: () => void;
  onResetData: () => void;
}

// Available emoji avatars
const AVATAR_EMOJIS = ['👶', '👧', '👦', '🧒', '👼', '🍼', '🌟', '💫', '🌙', '☀️', '🌈', '🦋'];

export const RosieProfile: React.FC<RosieProfileProps> = ({
  baby,
  growthMeasurements,
  onUpdateBaby,
  onAddMeasurement,
  onDeleteMeasurement,
  onClose,
  onResetData,
}) => {
  const [activeSection, setActiveSection] = useState<'profile' | 'growth' | 'settings'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editName, setEditName] = useState(baby.name);
  const [editBirthDate, setEditBirthDate] = useState(baby.birthDate.split('T')[0]);
  const [editGender, setEditGender] = useState(baby.gender || 'other');
  const [editAvatar, setEditAvatar] = useState(baby.avatarEmoji || '👶');
  const [editAvatarImage, setEditAvatarImage] = useState(baby.avatarImage || '');
  const [editAvatarType, setEditAvatarType] = useState<'emoji' | 'image'>(baby.avatarType || 'emoji');

  // New measurement form state
  const [newWeight, setNewWeight] = useState('');
  const [newLength, setNewLength] = useState('');
  const [newHead, setNewHead] = useState('');
  const [newMeasurementNote, setNewMeasurementNote] = useState('');

  // Calculate age
  const getAgeDisplay = () => {
    const birth = new Date(baby.birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30.44);

    if (months >= 1) {
      return `${months} month${months !== 1 ? 's' : ''} old`;
    } else if (weeks >= 1) {
      return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
    } else {
      return `${days} day${days !== 1 ? 's' : ''} old`;
    }
  };

  const handleSaveProfile = () => {
    onUpdateBaby({
      ...baby,
      name: editName.trim() || baby.name,
      birthDate: new Date(editBirthDate).toISOString(),
      gender: editGender,
      avatarEmoji: editAvatar,
      avatarImage: editAvatarImage,
      avatarType: editAvatarType,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(baby.name);
    setEditBirthDate(baby.birthDate.split('T')[0]);
    setEditGender(baby.gender || 'other');
    setEditAvatar(baby.avatarEmoji || '👶');
    setEditAvatarImage(baby.avatarImage || '');
    setEditAvatarType(baby.avatarType || 'emoji');
    setIsEditing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Resize image to reduce storage size
      resizeImage(result, 200, 200, (resizedImage) => {
        setEditAvatarImage(resizedImage);
        setEditAvatarType('image');
      });
    };
    reader.readAsDataURL(file);
  };

  const resizeImage = (
    dataUrl: string,
    maxWidth: number,
    maxHeight: number,
    callback: (result: string) => void
  ) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      }
    };
    img.src = dataUrl;
  };

  const handleRemoveImage = () => {
    setEditAvatarImage('');
    setEditAvatarType('emoji');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to render avatar (emoji or image)
  const renderAvatar = (size: 'small' | 'large' | 'header' = 'large') => {
    const sizeClass = size === 'small' ? 'rosie-profile-avatar-small' :
                      size === 'header' ? 'rosie-profile-avatar-header' :
                      'rosie-profile-avatar-large';

    if ((isEditing ? editAvatarType : baby.avatarType) === 'image' && (isEditing ? editAvatarImage : baby.avatarImage)) {
      return (
        <div className={`${sizeClass} has-image`}>
          <img
            src={isEditing ? editAvatarImage : baby.avatarImage}
            alt={`${baby.name}'s photo`}
          />
        </div>
      );
    }

    return (
      <div className={sizeClass}>
        {isEditing ? editAvatar : (baby.avatarEmoji || '👶')}
      </div>
    );
  };

  const handleAddMeasurement = () => {
    if (!newWeight && !newLength && !newHead) return;

    onAddMeasurement({
      weight: newWeight ? parseFloat(newWeight) : undefined,
      length: newLength ? parseFloat(newLength) : undefined,
      headCircumference: newHead ? parseFloat(newHead) : undefined,
      note: newMeasurementNote.trim() || undefined,
    });

    setNewWeight('');
    setNewLength('');
    setNewHead('');
    setNewMeasurementNote('');
    setShowAddMeasurement(false);
  };

  const formatMeasurementDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLatestMeasurement = () => {
    if (growthMeasurements.length === 0) return null;
    return growthMeasurements[0]; // Assuming sorted newest first
  };

  const latestMeasurement = getLatestMeasurement();

  return (
    <div className="rosie-modal-overlay" onClick={onClose}>
      <div className="rosie-modal rosie-profile-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="rosie-profile-header">
          <button className="rosie-profile-close" onClick={onClose}>
            Done
          </button>
          <h2 className="rosie-profile-title">Profile</h2>
          <div className="rosie-profile-close-spacer" />
        </div>

        {/* Section Tabs */}
        <div className="rosie-profile-tabs">
          <button
            className={`rosie-profile-tab ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            Baby
          </button>
          <button
            className={`rosie-profile-tab ${activeSection === 'growth' ? 'active' : ''}`}
            onClick={() => setActiveSection('growth')}
          >
            Growth
          </button>
          <button
            className={`rosie-profile-tab ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSection('settings')}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="rosie-profile-content">
          {/* Baby Profile Section */}
          {activeSection === 'profile' && (
            <div className="rosie-profile-section">
              {!isEditing ? (
                <>
                  {/* Avatar Display */}
                  <div className="rosie-profile-avatar-display">
                    {renderAvatar('large')}
                    <h3 className="rosie-profile-name">{baby.name}</h3>
                    <p className="rosie-profile-age">{getAgeDisplay()}</p>
                  </div>

                  {/* Info Cards */}
                  <div className="rosie-profile-info-grid">
                    <div className="rosie-profile-info-card">
                      <div className="rosie-profile-info-label">Birth Date</div>
                      <div className="rosie-profile-info-value">
                        {new Date(baby.birthDate).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="rosie-profile-info-card">
                      <div className="rosie-profile-info-label">Gender</div>
                      <div className="rosie-profile-info-value">
                        {baby.gender === 'boy' ? 'Boy' : baby.gender === 'girl' ? 'Girl' : 'Not specified'}
                      </div>
                    </div>
                    {latestMeasurement && (
                      <>
                        {latestMeasurement.weight && (
                          <div className="rosie-profile-info-card">
                            <div className="rosie-profile-info-label">Current Weight</div>
                            <div className="rosie-profile-info-value">
                              {latestMeasurement.weight} {baby.weightUnit || 'lb'}
                            </div>
                          </div>
                        )}
                        {latestMeasurement.length && (
                          <div className="rosie-profile-info-card">
                            <div className="rosie-profile-info-label">Current Length</div>
                            <div className="rosie-profile-info-value">
                              {latestMeasurement.length} {baby.lengthUnit || 'in'}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    className="rosie-profile-edit-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                </>
              ) : (
                /* Edit Mode */
                <div className="rosie-profile-edit-form">
                  {/* Avatar Picker */}
                  <div className="rosie-profile-avatar-picker">
                    <div className="rosie-profile-avatar-current-wrapper">
                      {renderAvatar('large')}
                    </div>

                    {/* Photo Upload Section */}
                    <div className="rosie-profile-photo-section">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      <div className="rosie-profile-photo-buttons">
                        <button
                          type="button"
                          className="rosie-profile-photo-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {editAvatarType === 'image' ? 'Change Photo' : 'Add Photo'}
                        </button>
                        {editAvatarType === 'image' && (
                          <button
                            type="button"
                            className="rosie-profile-photo-btn remove"
                            onClick={handleRemoveImage}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Emoji Picker - show as alternative */}
                    <div className="rosie-profile-emoji-section">
                      <p className="rosie-profile-emoji-label">Or choose an emoji:</p>
                      <div className="rosie-profile-avatar-grid">
                        {AVATAR_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            className={`rosie-profile-avatar-option ${editAvatarType === 'emoji' && editAvatar === emoji ? 'selected' : ''}`}
                            onClick={() => {
                              setEditAvatar(emoji);
                              setEditAvatarType('emoji');
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="rosie-profile-field">
                    <label className="rosie-profile-field-label">Name</label>
                    <input
                      type="text"
                      className="rosie-profile-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Baby's name"
                    />
                  </div>

                  {/* Birth Date Input */}
                  <div className="rosie-profile-field">
                    <label className="rosie-profile-field-label">Birth Date</label>
                    <input
                      type="date"
                      className="rosie-profile-input"
                      value={editBirthDate}
                      onChange={e => setEditBirthDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Gender Select */}
                  <div className="rosie-profile-field">
                    <label className="rosie-profile-field-label">Gender</label>
                    <div className="rosie-profile-gender-options">
                      {(['boy', 'girl', 'other'] as const).map(g => (
                        <button
                          key={g}
                          className={`rosie-profile-gender-btn ${editGender === g ? 'selected' : ''}`}
                          onClick={() => setEditGender(g)}
                        >
                          {g === 'boy' ? '👦 Boy' : g === 'girl' ? '👧 Girl' : '🧒 Other'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="rosie-profile-edit-actions">
                    <button
                      className="rosie-profile-cancel-btn"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      className="rosie-profile-save-btn"
                      onClick={handleSaveProfile}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Growth Section */}
          {activeSection === 'growth' && (
            <div className="rosie-profile-section">
              <div className="rosie-growth-header">
                <h3 className="rosie-growth-title">Growth Tracking</h3>
                <button
                  className="rosie-growth-add-btn"
                  onClick={() => setShowAddMeasurement(true)}
                >
                  + Add
                </button>
              </div>

              {/* Add Measurement Form */}
              {showAddMeasurement && (
                <div className="rosie-growth-form">
                  <div className="rosie-growth-form-row">
                    <div className="rosie-profile-field">
                      <label className="rosie-profile-field-label">Weight ({baby.weightUnit || 'lb'})</label>
                      <input
                        type="number"
                        step="0.1"
                        className="rosie-profile-input"
                        value={newWeight}
                        onChange={e => setNewWeight(e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="rosie-profile-field">
                      <label className="rosie-profile-field-label">Length ({baby.lengthUnit || 'in'})</label>
                      <input
                        type="number"
                        step="0.1"
                        className="rosie-profile-input"
                        value={newLength}
                        onChange={e => setNewLength(e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                  </div>
                  <div className="rosie-profile-field">
                    <label className="rosie-profile-field-label">Head Circumference ({baby.lengthUnit || 'in'})</label>
                    <input
                      type="number"
                      step="0.1"
                      className="rosie-profile-input"
                      value={newHead}
                      onChange={e => setNewHead(e.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="rosie-profile-field">
                    <label className="rosie-profile-field-label">Note (optional)</label>
                    <input
                      type="text"
                      className="rosie-profile-input"
                      value={newMeasurementNote}
                      onChange={e => setNewMeasurementNote(e.target.value)}
                      placeholder="Doctor visit, etc."
                    />
                  </div>
                  <div className="rosie-growth-form-actions">
                    <button
                      className="rosie-profile-cancel-btn"
                      onClick={() => setShowAddMeasurement(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="rosie-profile-save-btn"
                      onClick={handleAddMeasurement}
                      disabled={!newWeight && !newLength && !newHead}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Measurements List */}
              {growthMeasurements.length === 0 ? (
                <div className="rosie-growth-empty">
                  <div className="rosie-growth-empty-icon">📏</div>
                  <p className="rosie-growth-empty-text">No measurements recorded yet</p>
                  <p className="rosie-growth-empty-hint">
                    Track {baby.name}'s growth by adding weight and length measurements
                  </p>
                </div>
              ) : (
                <div className="rosie-growth-list">
                  {growthMeasurements.map(measurement => (
                    <div key={measurement.id} className="rosie-growth-item">
                      <div className="rosie-growth-item-date">
                        {formatMeasurementDate(measurement.timestamp)}
                      </div>
                      <div className="rosie-growth-item-values">
                        {measurement.weight && (
                          <span className="rosie-growth-value">
                            <span className="rosie-growth-value-label">Weight:</span>
                            {measurement.weight} {baby.weightUnit || 'lb'}
                          </span>
                        )}
                        {measurement.length && (
                          <span className="rosie-growth-value">
                            <span className="rosie-growth-value-label">Length:</span>
                            {measurement.length} {baby.lengthUnit || 'in'}
                          </span>
                        )}
                        {measurement.headCircumference && (
                          <span className="rosie-growth-value">
                            <span className="rosie-growth-value-label">Head:</span>
                            {measurement.headCircumference} {baby.lengthUnit || 'in'}
                          </span>
                        )}
                      </div>
                      {measurement.note && (
                        <div className="rosie-growth-item-note">{measurement.note}</div>
                      )}
                      <button
                        className="rosie-growth-delete-btn"
                        onClick={() => onDeleteMeasurement(measurement.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="rosie-profile-section">
              <div className="rosie-settings-group">
                <h4 className="rosie-settings-group-title">Data Management</h4>

                <div className="rosie-settings-item">
                  <div className="rosie-settings-item-info">
                    <div className="rosie-settings-item-label">Export Data</div>
                    <div className="rosie-settings-item-desc">
                      Download all your data as a JSON file
                    </div>
                  </div>
                  <button className="rosie-settings-btn">
                    Export
                  </button>
                </div>

                <div className="rosie-settings-item danger">
                  <div className="rosie-settings-item-info">
                    <div className="rosie-settings-item-label">Reset All Data</div>
                    <div className="rosie-settings-item-desc">
                      Delete all data and start fresh
                    </div>
                  </div>
                  <button
                    className="rosie-settings-btn danger"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="rosie-settings-group">
                <h4 className="rosie-settings-group-title">About</h4>
                <div className="rosie-settings-about">
                  <p><strong>Rosie AI</strong></p>
                  <p className="rosie-settings-about-desc">
                    Calm technology for chaotic moments.
                    Helping parents track and understand their baby's needs.
                  </p>
                  <p className="rosie-settings-version">Version 1.0.0</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="rosie-confirm-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="rosie-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="rosie-confirm-delete-icon">⚠️</div>
              <div className="rosie-confirm-delete-title">Reset All Data?</div>
              <div className="rosie-confirm-delete-text">
                This will permanently delete all of {baby.name}'s timeline data, growth measurements,
                and chat history. This action cannot be undone.
              </div>
              <div className="rosie-confirm-delete-actions">
                <button
                  className="rosie-btn-close"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="rosie-btn-danger"
                  onClick={() => {
                    onResetData();
                    setShowResetConfirm(false);
                  }}
                >
                  Reset Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RosieProfile;
