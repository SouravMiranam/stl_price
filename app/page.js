'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [materialType, setMaterialType] = useState('PLA');
  const [infillDensity, setInfillDensity] = useState(25);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('materialType', materialType);
    formData.append('infillDensity', infillDensity);

    try {
      setUploading(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data.parameters); // received from backend
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">STL Price Estimator</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Settings</h2>
        
        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            STL File
          </label>
          <input
            type="file"
            accept=".stl"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Material Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Material Type
          </label>
          <select
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value)}
            className="w-full px-3 py-2 border text-red-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option className='text-red-600' value="PLA">PLA (1.24 g/cm³) - $0.025/g</option>
            <option className='text-red-600' value="ABS">ABS (1.05 g/cm³) - $0.030/g</option>
            <option className='text-red-600' value="PETG">PETG (1.27 g/cm³) - $0.035/g</option>
            <option className='text-red-600' value="TPU">TPU (1.20 g/cm³) - $0.050/g</option>
            <option className='text-red-600' value="ASA">ASA (1.05 g/cm³) - $0.040/g</option>
          </select>
        </div>

        {/* Infill Density Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Infill Density: {infillDensity}%
          </label>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={infillDensity}
            onChange={(e) => setInfillDensity(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5% (Hollow)</span>
            <span>50% (Standard)</span>
            <span>100% (Solid)</span>
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Processing...' : 'Estimate Price'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Print Estimation Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm text-gray-600 font-medium">{key}</div>
                <div className="text-lg font-semibold text-blue-600">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
