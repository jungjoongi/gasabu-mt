import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // dev 서버를 LAN IP 로 띄울 때 cross-origin 차단을 풀기 위함.
  // 행사 와이파이/펜션 LAN 의 192.168.x.x 대역 전체를 허용.
  allowedDevOrigins: [
    '192.168.0.110',
    '192.168.0.*',
    '192.168.1.*',
    '10.0.0.*',
    'localhost',
  ],
}

export default nextConfig
