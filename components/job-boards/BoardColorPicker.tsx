'use client'

import { useState } from 'react'

const solidColors = [
  '#22c55e',
  '#eab308',
  '#ef4444',
  '#3b82f6',
  '#a855f7',
  '#f97316',
  '#14b8a6',
  '#64748b',
]

const gradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #ff9966, #ff5e62)',
  'linear-gradient(135deg, #56ab2f, #a8e063)',
  'linear-gradient(135deg, #2193b0, #6dd5ed)',
]

export default function BoardColorPicker({
  value,
  onChange,
}: {
  value?: string
  onChange: (val: string) => void
}) {
  const [customColor, setCustomColor] = useState('#000000')
  const [gradStart, setGradStart] = useState('#000000')
  const [gradEnd, setGradEnd] = useState('#ffffff')

  const applyCustomGradient = () => {
    const gradient = `linear-gradient(135deg, ${gradStart}, ${gradEnd})`
    onChange(gradient)
  }

  return (
    <div className="space-y-4 mt-2">

      {/* SOLID COLORS */}
      <div>
        <p className="text-xs font-medium mb-2 text-gray-600">Solid</p>

        <div className="flex gap-2 flex-wrap">
          {solidColors.map(color => (
            <div
              key={color}
              onClick={() => onChange(color)}
              className={`w-6 h-6 rounded cursor-pointer border ${
                value === color ? 'border-black' : 'border-transparent'
              }`}
              style={{ background: color }}
            />
          ))}
        </div>

        {/* Custom Solid */}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value)
              onChange(e.target.value)
            }}
            className="w-8 h-6 cursor-pointer"
          />
          <span className="text-xs text-gray-500">Custom</span>
        </div>
      </div>

      {/* GRADIENTS */}
      <div>
        <p className="text-xs font-medium mb-2 text-gray-600">Gradients</p>

        <div className="flex gap-2 flex-wrap">
          {gradients.map(gradient => (
            <div
              key={gradient}
              onClick={() => onChange(gradient)}
              className={`w-10 h-6 rounded cursor-pointer border ${
                value === gradient ? 'border-black' : 'border-transparent'
              }`}
              style={{ background: gradient }}
            />
          ))}
        </div>

        {/* Custom Gradient Builder */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={gradStart}
              onChange={(e) => setGradStart(e.target.value)}
              className="w-8 h-6 cursor-pointer"
            />
            <input
              type="color"
              value={gradEnd}
              onChange={(e) => setGradEnd(e.target.value)}
              className="w-8 h-6 cursor-pointer"
            />
            <button
              onClick={applyCustomGradient}
              className="text-xs bg-slate-200 px-2 py-1 rounded"
            >
              Apply
            </button>
          </div>

          <div
            className="w-full h-6 rounded"
            style={{
              background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
            }}
          />
        </div>
      </div>
    </div>
  )
}