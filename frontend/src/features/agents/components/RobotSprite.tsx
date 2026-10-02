type Props = { commander: boolean };
export function RobotSprite({ commander }: Props) {
  return <svg className="sm-mech" viewBox="0 0 64 86" aria-hidden="true">
    <ellipse cx="32" cy="79" rx={commander ? 29 : 24} ry="5" fill="#020918" opacity=".65" />
    {commander && <g className="sm-command-ring" fill="none" stroke="#89eaff"><ellipse cx="32" cy="78" rx="29" ry="6" strokeWidth="1.5" /><path d="M3 76h8m42 0h8M32 70v4m0 8v3" strokeWidth="2" /></g>}
    <g className="sm-leg-left"><path d="M19 52h10v12l-3 5H16l1-11z" fill="#62798a" stroke="#0b1727" strokeWidth="2" /><path d="M18 58h9v7h-9z" fill="var(--robot-color)" /><path d="M17 67h10v9H15z" fill="#263c53" stroke="#0b1727" strokeWidth="2" /><path d="M15 73h14v7H11v-4z" fill="#9bafbe" stroke="#0b1727" strokeWidth="2" /><path d="M12 78h17" stroke="#d5e4e5" strokeWidth="2" /></g>
    <g className="sm-leg-right"><path d="M35 52h10l2 6 1 11H38l-3-5z" fill="#62798a" stroke="#0b1727" strokeWidth="2" /><path d="M37 58h9v7h-9z" fill="var(--robot-color)" /><path d="M37 67h10l2 9H37z" fill="#263c53" stroke="#0b1727" strokeWidth="2" /><path d="M35 73h14l4 3v4H35z" fill="#9bafbe" stroke="#0b1727" strokeWidth="2" /><path d="M35 78h17" stroke="#d5e4e5" strokeWidth="2" /></g>
    <g className="sm-mech-body">
      {commander && <g stroke="#0b1727" strokeWidth="2"><path d="M16 29 6 24 3 30v17l8 6 7-10zM48 29l10-5 3 6v17l-8 6-7-10z" fill="#4c83a0" /><path d="M8 29v13m48-13v13" stroke="#b4f6ff" strokeWidth="3" /><path d="M22 19 18 8l7 4 7-10 7 10 7-4-4 11z" fill="#d7b960" /><path d="m29 9 3-5 3 5-3 4z" fill="#edfaff" /></g>}
      <g className="sm-arm-left"><path d="M11 30 5 36l2 17 6 3 5-6-1-17z" fill="#8199aa" stroke="#0b1727" strokeWidth="2" /><path d="M6 33h13v12H7z" fill="var(--robot-color)" stroke="#0b1727" strokeWidth="2" /><path d="M8 46h7v10H8z" fill="#2c4359" /><path d="M7 53h10v7H7z" fill="#afbbc5" stroke="#0b1727" strokeWidth="2" /><path d="M10 54v4m4-4v4" stroke="#40566b" /></g>
      <g className="sm-arm-right"><path d="m53 30 6 6-2 17-6 3-5-6 1-17z" fill="#8199aa" stroke="#0b1727" strokeWidth="2" /><path d="M45 33h13l-1 12H45z" fill="var(--robot-color)" stroke="#0b1727" strokeWidth="2" /><path d="M49 46h7v10h-7z" fill="#2c4359" /><path d="M47 53h10v7H47z" fill="#afbbc5" stroke="#0b1727" strokeWidth="2" /><path d="M50 54v4m4-4v4" stroke="#40566b" /></g>
      <path d="M18 29h28l3 13-6 14H21l-6-14z" fill="#40576c" stroke="#0b1727" strokeWidth="2" /><path d="M19 30h26l1 10-14 6-14-6z" fill="var(--robot-color)" /><path d="M21 32h22l-11 8z" fill="#ecf6ee" opacity=".5" /><path d="m32 36 7 6-7 7-7-7z" fill="#071c30" stroke="#c9edfb" strokeWidth="1.5" /><path className="sm-reactor" d="m32 39 3 3-3 4-3-4z" fill="#d5ffff" /><path d="M23 50h18v6H23z" fill="#a3b6c0" /><path d="M27 52h10v2H27z" fill="#233950" />
      <path d="M23 14h18l5 6-2 12H20l-2-12z" fill="#809baa" stroke="#0b1727" strokeWidth="2" /><path d="M22 17h20l1 8-4 3H25l-4-3z" fill="#081d30" /><path d="M24 21h6v3h-6m10-3h6v3h-6" stroke="#a9f8ff" strokeWidth="2" /><path d="M27 30h10" stroke="#cfdee2" strokeWidth="2" />
      {!commander && <><path d="M21 16 19 9m24 7 2-7" stroke="#bed1dc" strokeWidth="2" /><path d="M17 7h4v4h-4m22-4h4v4h-4" fill="var(--robot-color)" /></>}
    </g>
  </svg>;
}
