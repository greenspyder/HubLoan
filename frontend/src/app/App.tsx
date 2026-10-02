import { Navigate, Route, Routes } from 'react-router-dom';
import { AgentWorkspacePage } from '../features/agents/pages/AgentWorkspacePage';

export default function App() {
  return <Routes><Route path="/" element={<AgentWorkspacePage />} /><Route path="/agentes" element={<AgentWorkspacePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
