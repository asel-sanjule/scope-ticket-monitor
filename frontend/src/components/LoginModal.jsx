import { useState } from 'react';

export function LoginModal({ onClose, onSendLink }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      await onSendLink(email);
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.error || 'Something went wrong. Try again.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        {status === 'sent' ? (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-600 mb-4">
              We sent a sign-in link to <strong>{email}</strong>. Open it on this device to continue.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
            >
              Close
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Sign in to follow this movie</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email and we'll send you a sign-in link. No password needed.
            </p>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {status === 'error' && (
              <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white
                           text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {status === 'sending' ? 'Sending…' : 'Send link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}