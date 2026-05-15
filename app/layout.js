import './globals.css';

export const metadata = {
  title: 'PLIN — 공연 기록 & 팬 커뮤니티',
  description: '나만의 공연 기록을 남기고, 팬들과 소통하는 공연 메이트 앱 PLIN',
  keywords: '공연, 콘서트, 기록, 셋리스트, 팬 커뮤니티',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <div className="app-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
