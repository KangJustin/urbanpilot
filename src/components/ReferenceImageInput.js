import React, { useState, useRef } from 'react';
import { Upload, Loader2, X, CheckCircle2 } from 'lucide-react';
import { uploadReferenceImage } from '../services/analysisApi';

export default function ReferenceImageInput({ referenceImage, onReferenceImageChange }) {
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!licenseConfirmed) {
      setError('Confirm you have the rights to use this photo before uploading.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const result = await uploadReferenceImage(file, licenseConfirmed);
      onReferenceImageChange(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleRemove() {
    onReferenceImageChange(null);
    setLicenseConfirmed(false);
    setError(null);
  }

  if (referenceImage) {
    return (
      <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/20 p-2.5">
        <div className="flex items-center gap-2">
          <img src={referenceImage.imageUrl} alt="Reference" className="w-10 h-10 rounded object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> Reference photo attached
            </div>
            <div className="text-[10px] text-slate-500 truncate">Will be used as a Midjourney composition reference</div>
          </div>
          <button onClick={handleRemove} className="text-slate-500 hover:text-rose-400 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-2.5">
      <label className="flex items-start gap-2 text-[11px] text-slate-400 mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={licenseConfirmed}
          onChange={e => setLicenseConfirmed(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        I confirm I own this photo or have the rights to use it as an AI reference image.
      </label>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={!licenseConfirmed || uploading}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploading ? 'Uploading…' : 'Upload reference photo (optional)'}
      </button>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
      {error && <div className="text-[11px] text-rose-400 mt-1.5">{error}</div>}
    </div>
  );
}
