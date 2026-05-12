import { useState } from 'react';
import { Modal } from '../ui/Modal';

interface ShareModalProps {
  documentId: string;
  onClose: () => void;
}

export function ShareModal({ documentId, onClose }: ShareModalProps) {
  const shareUrl = `${window.location.origin}/workspace/${documentId}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal title="Share Document" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">
        Anyone with a collabdocs account and this link can view and edit this document in real time.
      </p>
      <div className="flex gap-2 mb-2">
        <input
          readOnly
          value={shareUrl}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2 outline-none text-gray-700 cursor-text"
        />
        <button
          onClick={handleCopy}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>
    </Modal>
  );
}
