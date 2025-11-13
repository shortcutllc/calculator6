import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ServiceAgreement: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card-large overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-8 py-6 flex justify-between items-center bg-white hover:bg-neutral-light-gray transition-colors"
      >
        <h2 className="text-xl font-extrabold text-shortcut-blue">
          Service Agreement
        </h2>
        {isExpanded ? <ChevronUp size={20} className="text-text-dark-60" /> : <ChevronDown size={20} className="text-text-dark-60" />}
      </button>
      
      {isExpanded && (
        <div className="px-8 pb-8 prose max-w-none border-t border-gray-200 pt-8">
          <h3 className="text-lg font-extrabold text-shortcut-blue mb-6">SHORTCUT EVENTS SERVICE AGREEMENT</h3>

          <div className="space-y-8">
            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">1. BACKGROUND</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">1.1 Shortcut provides corporate wellness services including massage, manicure, mindfulness sessions, and professional headshot photography services.</p>
                <p className="text-text-dark">1.2 Partner wishes to engage Shortcut to provide these services to Partner's employees as part of their corporate wellness program.</p>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">3. SHORTCUT RESPONSIBILITIES</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">3.1 Shortcut shall:</p>
                <ul className="list-disc pl-8 space-y-1 text-text-dark">
                  <li>Provide all necessary equipment and supplies</li>
                  <li>Ensure all providers are fully insured and qualified (including having the necessary skill and training to perform the services in a competent and professional manner)</li>
                  <li>Offer flexible scheduling options</li>
                  <li>Maintain a manager dashboard for tracking</li>
                  <li>Provide event promotion materials</li>
                  <li>Handle all booking and calendar integrations</li>
                  <li>Offer both in-person and virtual options where applicable</li>
                </ul>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">4. PARTNER RESPONSIBILITIES</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">4.1 Partner shall:</p>
                <ul className="list-disc pl-8 space-y-1 text-text-dark">
                  <li>Provide adequate space for services</li>
                  <li>Ensure minimum participant requirements are met</li>
                  <li>Submit payments according to agreed terms</li>
                  <li>Provide notice for cancellations as specified</li>
                  <li>Communicate any special requirements in advance</li>
                </ul>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">5. PAYMENT TERMS</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">5.1 Shortcut will issue an prior to each scheduled event. Payment is due 48 hours prior to the first scheduled event.</p>
                <p className="text-text-dark">5.2 Late payments beyond the grace period may incur a 5% late fee.</p>
                <p className="text-text-dark">5.3 Partner shall provide all necessary vendor registration, payment portal access, or other payment processing requirements within 48 hours of executing this Agreement.</p>
                <p className="text-text-dark">5.4 Any delay in providing payment processing access may result in postponement of scheduled services.</p>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">6. SCHEDULING AND MODIFICATIONS</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark mb-2">6.1 Additional requests must be submitted:</p>
                <ul className="list-disc pl-8 mb-4 space-y-1 text-text-dark">
                  <li>At least 5 days prior for additional hours/providers</li>
                  <li>At least 7 days prior for new events</li>
                </ul>

                <p className="text-text-dark mb-2">6.2 Cancellation Policy:</p>
                <ul className="list-disc pl-8 space-y-1 text-text-dark">
                  <li>72+ hours notice: No penalty</li>
                  <li>Less than 72 hours: No guaranteed rescheduling</li>
                </ul>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">7. CONFIDENTIALITY AND DATA PROTECTION</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">7.1 Each party shall maintain the confidentiality of all non-public information obtained during service delivery, including but not limited to employee personal data, booking information, and corporate information.</p>
                <p className="text-text-dark">7.2 Both parties shall comply with applicable data protection laws and regulations regarding the collection, storage, and processing of personal information.</p>
                <p className="text-text-dark">7.3 Shortcut shall hold conﬁdential all of Partner's Conﬁdential Information and shall not, during or after the Term of this Agreement, use any of Partner's Conﬁdential Information, or any part thereof, for any purpose other than those uses speciﬁcally permitted in writing by Partner.</p>
                <p className="text-text-dark">7.4 Upon termination of this Agreement, Shortcut shall immediately deliver to Partner any and all materials in Shortcut's possession, custody, or control, without keeping any copies, that contain any Conﬁdential Information or that are otherwise the property of Partner.</p>
                <p className="text-text-dark">7.5 Audio and/or video recording of virtual programs are not allowed unless all parties consent to it. If consent is given, the recorded content is for password-protected internal use only, and may not be made available via publicly accessible channels.</p>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">8. INSURANCE AND INDEMNIFICATION</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">8.1 Shortcut shall maintain comprehensive general liability insurance of at least $2,000,000 per occurrence.</p>
                <p className="text-text-dark">8.2 Each party agrees to indemnify, defend, and hold harmless the other party from any third-party claims arising from its own negligence or willful misconduct in connection with the performance of its obligations under this Agreement.</p>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">9. FORCE MAJEURE</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">9.1 Neither party shall be liable for delays or failures in performance caused by circumstances beyond reasonable control, including but not limited to:</p>
                <ul className="list-disc pl-8 space-y-1 text-text-dark">
                  <li>Public health emergencies</li>
                  <li>Severe weather conditions</li>
                  <li>Government restrictions</li>
                  <li>Acts of nature</li>
                  <li>Civil unrest</li>
                </ul>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">10. TERM AND TERMINATION</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">10.1 This Agreement shall commence on the Effective Date and shall continue until December 31, 2025 whereupon the retainer of Shortcut by Partner will terminate, unless earlier terminated by either party pursuant to the provisions herein.</p>
                <p className="text-text-dark">10.2 Either party may terminate this Agreement with 15 days written notice (email sufficient).</p>
                <p className="text-text-dark">10.3 Partner shall pay for all services rendered through the termination date.</p>
                <p className="text-text-dark">10.4 Sections regarding confidentiality, intellectual property, and indemnification shall survive termination.</p>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-extrabold text-shortcut-blue mb-4">11. GENERAL PROVISIONS</h4>
              <div className="pl-4 space-y-2">
                <p className="text-text-dark">11.1 Severability: If any provision of this Agreement is deemed unenforceable under applicable law, the remaining provisions will remain in full effect.</p>
                <p className="text-text-dark">11.2 Disputes: Any disputes arising from this Agreement will be resolved through binding arbitration in New York, NY, in accordance with Delaware commercial arbitration rules. Parties waive the right to trial by jury.</p>
                <p className="text-text-dark">11.3 Limitation of Liability: Neither party will be liable for indirect, special, or consequential damages, including loss of profits. Liability will not exceed the total amounts paid under this Agreement.</p>
                <p className="text-text-dark">11.4 Amendment and Waiver: Changes to this Agreement must be in writing and signed by both parties. Waivers of any provision will not constitute ongoing waivers.</p>
                <p className="text-text-dark">11.5 Governing Law: This Agreement shall be governed by the laws of the State of New York.</p>
                <p className="text-text-dark">11.6 Relationship of the Parties: Shortcut has no authority to bind Partner. Partner and Shortcut agree that Shortcut is an independent contractor of Partner and this Agreement shall not be construed to create any association, partnership, joint venture, employee, or agency relationship between Shortcut and Partner for any purpose.</p>
                <p className="text-text-dark">11.7 Assignment: Shortcut shall not assign this Agreement, nor any rights granted herein, without the prior written consent of Partner, which consent may be withheld in Partner's sole and absolute discretion. Any assignment in violation of this Agreement shall be of no effect.</p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceAgreement;