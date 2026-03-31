import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <ScrollViewStyleReset />
        <link rel="stylesheet" href="/react-datepicker.css" />
        <style>{`
          .am-datepicker {
            width: 100%;
            border: 1.5px solid #d1d5db;
            border-radius: 8px;
            padding: 9px 12px;
            font-size: 14px;
            color: #111;
            outline: none;
            background: #fff;
            cursor: pointer;
            box-sizing: border-box;
          }
          .am-datepicker:focus { border-color: #111; }
          .am-datepicker:disabled { opacity: 0.5; cursor: not-allowed; }

          /* Portal overlay — renders outside the Modal so no clipping */
          .react-datepicker-portal {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.4);
            z-index: 99999;
          }
          .react-datepicker {
            font-family: inherit;
            border: 1.5px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 20px 48px rgba(0,0,0,0.18);
            overflow: hidden;
          }
          .react-datepicker__header {
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
            padding-top: 12px;
          }
          .react-datepicker__current-month { font-size: 14px; font-weight: 700; color: #111; }
          .react-datepicker__day-name { color: #9ca3af; font-size: 11px; font-weight: 600; }
          .react-datepicker__day { border-radius: 6px; font-size: 13px; color: #111; }
          .react-datepicker__day:hover { background-color: #f3f4f6; }
          .react-datepicker__day--selected { background-color: #111 !important; color: #fff !important; }
          .react-datepicker__day--in-range { background-color: #e5e7eb !important; color: #111 !important; }
          .react-datepicker__day--keyboard-selected { background-color: #e5e7eb; }
          .react-datepicker__navigation-icon::before { border-color: #6b7280; }
          .react-datepicker__time-container { border-left: 1px solid #e5e7eb; }
          .react-datepicker__time-list-item { font-size: 13px; }
          .react-datepicker__time-list-item--selected { background-color: #111 !important; }
          .react-datepicker__close-icon::after { background-color: #6b7280; }
        `}</style>
      </head>
      <body>
        {children}
        <div id="datepicker-portal" />
      </body>
    </html>
  );
}
