import React from 'react';
import AgentRow from './AgentRow';

export default function AgentPipeline({ agents, agentStatuses }) {
  return (
    <div className="up-panel px-4 py-3">
      <div className="up-label mb-2">Agent pipeline</div>
      {agents.map(a => (
        <AgentRow key={a.id} label={a.label} status={agentStatuses[a.id]} />
      ))}
    </div>
  );
}
