import React, { useState, useRef, useEffect } from 'react';
import { BabyProfile, ChatMessage, TimelineEvent, DevelopmentalInfo } from './types';
import { formatTime } from './developmentalData';

interface RosieChatProps {
  baby: BabyProfile;
  messages: ChatMessage[];
  onAddMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  onUpdateHistory: (messages: ChatMessage[]) => void;
  timeline: TimelineEvent[];
  developmentalInfo: DevelopmentalInfo;
}

const quickQuestions = [
  'Is this normal?',
  'Sleep help',
  'Feeding tips',
  'Why so fussy?',
];

export const RosieChat: React.FC<RosieChatProps> = ({
  baby,
  messages,
  onAddMessage,
  onUpdateHistory,
  timeline,
  developmentalInfo,
}) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate context-aware AI response (mock for now - can be replaced with real API)
  const generateResponse = async (userMessage: string): Promise<string> => {
    const { ageInDays, weekNumber, ageDisplay, sleepInfo, feedingInfo, whatToExpect } = developmentalInfo;

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const lowerMessage = userMessage.toLowerCase();

    // Sleep-related questions
    if (lowerMessage.includes('sleep') || lowerMessage.includes('wak') || lowerMessage.includes('nap') || lowerMessage.includes('tired')) {
      return `At ${ageDisplay}, ${baby.name}'s sleep is still developing. Here's what's typical for week ${weekNumber}:

• **Total sleep:** ${sleepInfo.totalSleep}
• **Night sleep:** ${sleepInfo.nightSleep}
• **Wake windows:** ${sleepInfo.wakeWindow}
• **Naps:** ${sleepInfo.napCount}

${weekNumber <= 8 ? `Remember, sleep patterns at this age are still very irregular. Focus on creating a calm environment and watching for sleepy cues rather than strict schedules.` : weekNumber <= 16 ? `If sleep has suddenly gotten worse, ${baby.name} may be going through the 4-month sleep regression. This is actually a sign of brain maturation - their sleep cycles are becoming more adult-like.` : `At this age, you can start working on more consistent sleep routines if you haven't already. But every baby is different - follow ${baby.name}'s lead.`}

Would you like specific tips for managing ${sleepInfo.wakeWindow} wake windows?`;
    }

    // Feeding-related questions
    if (lowerMessage.includes('feed') || lowerMessage.includes('eat') || lowerMessage.includes('hungry') || lowerMessage.includes('bottle') || lowerMessage.includes('breast') || lowerMessage.includes('milk')) {
      return `Here's what's typical for feeding at ${ageDisplay}:

• **Frequency:** ${feedingInfo.frequency}
${feedingInfo.amount ? `• **Amount:** ${feedingInfo.amount}` : ''}

${feedingInfo.notes.map(note => `• ${note}`).join('\n')}

${weekNumber <= 6 ? `Cluster feeding (frequent feeds, especially in the evening) is completely normal right now. It helps build your milk supply and comfort ${baby.name} during this fussy period.` : weekNumber <= 12 ? `${baby.name} is becoming more efficient at feeding. You might notice feeds getting shorter but still effective - this is normal progress!` : `Around this age, babies often become more distractible during feeds. Try feeding in a quiet, dim environment if ${baby.name} seems unfocused.`}

Is there something specific about feeding that's concerning you?`;
    }

    // Fussy/crying questions
    if (lowerMessage.includes('fuss') || lowerMessage.includes('cry') || lowerMessage.includes('colic') || lowerMessage.includes('upset') || lowerMessage.includes('screaming')) {
      if (weekNumber >= 5 && weekNumber <= 8) {
        return `At week ${weekNumber}, ${baby.name} is right in the peak fussiness period. This is one of the hardest phases, but it's temporary.

**What's happening:**
• Crying typically peaks around 6-8 weeks
• This is sometimes called "purple crying" or colic
• It's NOT your fault and often there's no clear cause

**What might help:**
• The 5 S's: Swaddle, Side/Stomach hold, Shush, Swing, Suck
• White noise or gentle rhythmic sounds
• Going outside for a change of scenery
• Taking turns with a partner - you need breaks too

**Important:** If the crying feels extreme or you're worried, it's always okay to call your pediatrician. Trust your instincts.

This phase usually improves dramatically by week 10-12. You're in the thick of it, but you're doing great.`;
      } else {
        return `Fussiness at ${ageDisplay} can have many causes:

${whatToExpect.slice(0, 3).map(item => `• ${item}`).join('\n')}

**Common reasons babies get fussy:**
• Overtired (watch those ${sleepInfo.wakeWindow} wake windows)
• Hunger (even if they recently ate)
• Overstimulation
• Gas or digestive discomfort
• Growth spurts
• Developmental leaps

**When to be concerned:**
• Fever over 100.4°F (especially under 3 months)
• Refusing to eat
• Inconsolable for hours with no breaks
• Significant change from their normal behavior

Trust your instincts - you know ${baby.name} best. If something feels wrong, call your pediatrician.`;
      }
    }

    // "Is this normal?" questions
    if (lowerMessage.includes('normal') || lowerMessage.includes('worried') || lowerMessage.includes('concern')) {
      return `It's so common to wonder "is this normal?" - you're not alone in this.

At ${ageDisplay}, here's what's typical for ${baby.name}:

${whatToExpect.map(item => `• ${item}`).join('\n')}

**Generally NOT concerning:**
• Irregular sleep patterns
• Cluster feeding
• Occasional fussiness or crying
• Hiccups, sneezing, or brief pauses in breathing during sleep
• Spitting up (if baby is gaining weight)

**Worth calling your pediatrician:**
• Fever over 100.4°F (especially under 3 months)
• Refusing multiple feeds
• Fewer than 6 wet diapers in 24 hours
• Extreme lethargy or difficulty waking
• Any concern that feels urgent to you

What specific thing has you worried? I can give you more targeted information.`;
    }

    // Growth spurt questions
    if (lowerMessage.includes('growth') || lowerMessage.includes('spurt') || lowerMessage.includes('constantly eating')) {
      return `Growth spurts are real! They typically happen around:
• Week 2-3
• Week 4-6
• Week 8-10
• Week 12
• Month 4
• Month 6

At ${ageDisplay}, ${weekNumber === 3 || weekNumber === 6 || weekNumber === 12 || weekNumber === 16 || weekNumber === 26 ? `${baby.name} may be going through one right now.` : `${baby.name} may have one coming up soon.`}

**Signs of a growth spurt:**
• Suddenly wanting to feed constantly
• More fussy than usual
• Sleep disruption
• Waking more at night

**What to do:**
• Feed on demand - this is temporary
• Rest when you can
• Remember it usually lasts 2-4 days

This increased demand is your baby's way of telling your body (or formula supply) to keep up. It's actually a good sign of healthy growth!`;
    }

    // Default response with context
    return `Thanks for asking about ${baby.name}. At ${ageDisplay} (week ${weekNumber}), here's some context that might help:

${whatToExpect.slice(0, 3).map(item => `• ${item}`).join('\n')}

**Sleep:** ${sleepInfo.totalSleep} total, wake windows of ${sleepInfo.wakeWindow}
**Feeding:** ${feedingInfo.frequency}

Could you tell me more about what you're experiencing? I can give more specific guidance if you share:
• What's happening
• When it started
• What you've tried

I'm here to help!`;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      role: 'user',
      content: userMessage,
    };

    const updatedMessages = [...messages, userMsg];
    onUpdateHistory(updatedMessages);

    // Generate AI response
    setIsTyping(true);
    try {
      const response = await generateResponse(userMessage);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: response,
      };

      onUpdateHistory([...updatedMessages, assistantMsg]);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (content: string) => {
    // Simple markdown-like rendering
    return content.split('\n\n').map((paragraph, i) => {
      // Handle bullet points
      if (paragraph.includes('\n•') || paragraph.startsWith('•')) {
        const items = paragraph.split('\n').filter(line => line.trim());
        return (
          <div key={i}>
            {items.map((item, j) => {
              if (item.startsWith('•')) {
                return <p key={j} style={{ marginLeft: '8px' }}>{item}</p>;
              }
              // Handle bold text with **
              const parts = item.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={j}>
                  {parts.map((part, k) =>
                    k % 2 === 1 ? <strong key={k}>{part}</strong> : part
                  )}
                </p>
              );
            })}
          </div>
        );
      }

      // Handle bold text with **
      const parts = paragraph.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i}>
          {parts.map((part, k) =>
            k % 2 === 1 ? <strong key={k}>{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="rosie-chat">
      {/* Input Area - Always visible at top */}
      <div className="rosie-chat-input-area">
        <div className="rosie-chat-input-header">
          <span>💬</span>
          <span>Ask me anything about {baby.name}</span>
        </div>
        <div className="rosie-chat-input-wrapper">
          <input
            type="text"
            className="rosie-chat-input"
            placeholder={`Why is ${baby.name} waking every 2 hours?`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            className="rosie-chat-send"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
          >
            Send
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="rosie-chat-messages">
        {messages.length === 0 && !isTyping && (
          <div className="rosie-empty">
            <div className="rosie-empty-icon">💭</div>
            <div className="rosie-empty-title">Hi! I'm Rosie</div>
            <div className="rosie-empty-text">
              I know {baby.name} is {developmentalInfo.ageDisplay}. Ask me anything about sleep, feeding, development, or what's normal at this age.
            </div>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`rosie-chat-message ${message.role}`}
          >
            {renderMessage(message.content)}
            <div className="rosie-chat-message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="rosie-chat-typing">
            <div className="rosie-chat-typing-dot" />
            <div className="rosie-chat-typing-dot" />
            <div className="rosie-chat-typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 0 && (
        <div className="rosie-chat-quick">
          {quickQuestions.map(question => (
            <button
              key={question}
              className="rosie-chat-quick-btn"
              onClick={() => handleQuickQuestion(question)}
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RosieChat;
