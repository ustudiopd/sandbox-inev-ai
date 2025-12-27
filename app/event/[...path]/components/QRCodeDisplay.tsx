'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeDisplay({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
          includeMargin={true}
        />
      </div>
    </div>
  )
}

