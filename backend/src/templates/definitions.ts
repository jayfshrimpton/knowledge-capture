import { DocumentFormat, DocumentSection } from '../types';

export type FieldType = 'text' | 'textarea' | 'list' | 'date' | 'select';

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  itemPlaceholder?: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  format: DocumentFormat;
  fields: TemplateField[];
  build(values: Record<string, string | string[]>): {
    summary: string;
    content: DocumentSection[];
    tags: string[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v.trim() : '';
}

function list(v: string | string[] | undefined): string[] {
  return Array.isArray(v) ? v.map((s) => s.trim()).filter(Boolean) : [];
}

function truncate(s: string, max = 120): string {
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const sop: TemplateDefinition = {
  id: 'sop',
  name: 'Standard Operating Procedure',
  description: 'Step-by-step procedure with purpose, scope, and roles.',
  icon: '📋',
  format: 'procedure',
  fields: [
    { id: 'purpose', label: 'Purpose', type: 'textarea', placeholder: 'Why does this procedure exist?', required: true },
    { id: 'scope', label: 'Scope', type: 'textarea', placeholder: 'What is covered (and not covered) by this procedure?' },
    { id: 'prerequisites', label: 'Prerequisites', type: 'list', itemPlaceholder: 'Add a prerequisite…' },
    { id: 'steps', label: 'Procedure Steps', type: 'list', itemPlaceholder: 'Add a step…', required: true },
    { id: 'roles', label: 'Roles & Responsibilities', type: 'list', itemPlaceholder: 'e.g. Team Lead — reviews output' },
    { id: 'warnings', label: 'Safety / Warnings', type: 'list', itemPlaceholder: 'Add a warning…' },
  ],
  build(values) {
    const content: DocumentSection[] = [
      { heading: 'Purpose', content: str(values.purpose) },
    ];
    if (str(values.scope)) content.push({ heading: 'Scope', content: str(values.scope) });
    if (list(values.prerequisites).length) content.push({ heading: 'Prerequisites', items: list(values.prerequisites) });
    content.push({ heading: 'Procedure', items: list(values.steps) });
    if (list(values.roles).length) content.push({ heading: 'Roles & Responsibilities', items: list(values.roles) });
    if (list(values.warnings).length) content.push({ heading: 'Safety & Warnings', items: list(values.warnings) });
    return {
      summary: truncate(str(values.purpose)),
      content,
      tags: ['sop', 'procedure'],
    };
  },
};

const checklist: TemplateDefinition = {
  id: 'checklist',
  name: 'Checklist',
  description: 'A simple, reusable checklist for any repeatable process.',
  icon: '✅',
  format: 'checklist',
  fields: [
    { id: 'purpose', label: 'Purpose', type: 'text', placeholder: 'What is this checklist for?', required: true },
    { id: 'items', label: 'Checklist Items', type: 'list', itemPlaceholder: 'Add an item…', required: true },
  ],
  build(values) {
    return {
      summary: str(values.purpose),
      content: [
        { heading: 'Purpose', content: str(values.purpose) },
        { heading: 'Items', items: list(values.items) },
      ],
      tags: ['checklist'],
    };
  },
};

const meetingMinutes: TemplateDefinition = {
  id: 'meeting-minutes',
  name: 'Meeting Minutes',
  description: 'Structured record of attendees, decisions, and action items.',
  icon: '🗒️',
  format: 'reference',
  fields: [
    { id: 'meeting_date', label: 'Meeting Date', type: 'date', required: true },
    { id: 'facilitator', label: 'Facilitator', type: 'text', placeholder: 'Name of the meeting facilitator' },
    { id: 'attendees', label: 'Attendees', type: 'list', itemPlaceholder: 'Add an attendee…', required: true },
    { id: 'agenda', label: 'Agenda Items', type: 'list', itemPlaceholder: 'Add an agenda item…' },
    { id: 'decisions', label: 'Decisions Made', type: 'list', itemPlaceholder: 'Add a decision…' },
    { id: 'actions', label: 'Action Items', type: 'list', itemPlaceholder: 'e.g. Jay — deploy hotfix by Friday' },
    { id: 'next_meeting', label: 'Next Meeting', type: 'text', placeholder: 'Date/time of the next meeting (optional)' },
  ],
  build(values) {
    const date = str(values.meeting_date);
    const facilitator = str(values.facilitator);
    const detailParts = [`Date: ${date}`];
    if (facilitator) detailParts.push(`Facilitator: ${facilitator}`);

    const content: DocumentSection[] = [
      { heading: 'Meeting Details', content: detailParts.join('\n') },
      { heading: 'Attendees', items: list(values.attendees) },
    ];
    if (list(values.agenda).length) content.push({ heading: 'Agenda', items: list(values.agenda) });
    if (list(values.decisions).length) content.push({ heading: 'Decisions Made', items: list(values.decisions) });
    if (list(values.actions).length) content.push({ heading: 'Action Items', items: list(values.actions) });
    if (str(values.next_meeting)) content.push({ heading: 'Next Meeting', content: str(values.next_meeting) });

    return {
      summary: `Meeting on ${date} — ${list(values.attendees).length} attendees`,
      content,
      tags: ['meeting', 'minutes'],
    };
  },
};

const handoverNotes: TemplateDefinition = {
  id: 'handover-notes',
  name: 'Handover Notes',
  description: 'Structured handover document covering status, tasks, and contacts.',
  icon: '🤝',
  format: 'reference',
  fields: [
    { id: 'from', label: 'Handover From', type: 'text', placeholder: 'Name of person handing over', required: true },
    { id: 'to', label: 'Handover To', type: 'text', placeholder: 'Name of person receiving', required: true },
    { id: 'handover_date', label: 'Handover Date', type: 'date', required: true },
    { id: 'current_status', label: 'Current Status', type: 'textarea', placeholder: 'What is the current state of things?', required: true },
    { id: 'pending_tasks', label: 'Pending Tasks', type: 'list', itemPlaceholder: 'Add a pending task…' },
    { id: 'known_issues', label: 'Known Issues', type: 'list', itemPlaceholder: 'Add a known issue…' },
    { id: 'contacts', label: 'Key Contacts', type: 'list', itemPlaceholder: 'e.g. Jane Smith — IT Support — jane@example.com' },
    { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Anything else the new owner should know?' },
  ],
  build(values) {
    const from = str(values.from);
    const to = str(values.to);
    const date = str(values.handover_date);

    const content: DocumentSection[] = [
      { heading: 'Handover Details', content: `From: ${from}\nTo: ${to}\nDate: ${date}` },
      { heading: 'Current Status', content: str(values.current_status) },
    ];
    if (list(values.pending_tasks).length) content.push({ heading: 'Pending Tasks', items: list(values.pending_tasks) });
    if (list(values.known_issues).length) content.push({ heading: 'Known Issues', items: list(values.known_issues) });
    if (list(values.contacts).length) content.push({ heading: 'Key Contacts', items: list(values.contacts) });
    if (str(values.notes)) content.push({ heading: 'Additional Notes', content: str(values.notes) });

    return {
      summary: `Handover from ${from} to ${to} on ${date}`,
      content,
      tags: ['handover'],
    };
  },
};

const riskRegister: TemplateDefinition = {
  id: 'risk-register',
  name: 'Risk Register Entry',
  description: 'Document a risk with likelihood, impact, owner, and mitigation.',
  icon: '⚠️',
  format: 'reference',
  fields: [
    { id: 'description', label: 'Risk Description', type: 'textarea', placeholder: 'Describe the risk clearly.', required: true },
    { id: 'likelihood', label: 'Likelihood', type: 'select', options: ['Low', 'Medium', 'High'], required: true },
    { id: 'impact', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High'], required: true },
    { id: 'owner', label: 'Risk Owner', type: 'text', placeholder: 'Who owns this risk?', required: true },
    { id: 'mitigation', label: 'Mitigation Strategy', type: 'textarea', placeholder: 'How will this risk be reduced or managed?' },
    { id: 'status', label: 'Status', type: 'select', options: ['Open', 'Monitoring', 'Mitigated', 'Closed'], required: true },
  ],
  build(values) {
    const likelihood = str(values.likelihood);
    const impact = str(values.impact);

    const riskLevelMap: Record<string, Record<string, string>> = {
      High: { High: 'Critical', Medium: 'High', Low: 'Medium' },
      Medium: { High: 'High', Medium: 'Medium', Low: 'Low' },
      Low: { High: 'Medium', Medium: 'Low', Low: 'Low' },
    };
    const riskLevel = riskLevelMap[likelihood]?.[impact] ?? 'Unknown';

    const content: DocumentSection[] = [
      { heading: 'Risk Description', content: str(values.description) },
      {
        heading: 'Risk Assessment',
        content: `Likelihood: ${likelihood}\nImpact: ${impact}\nOverall Risk Level: ${riskLevel}`,
      },
      { heading: 'Risk Owner', content: str(values.owner) },
    ];
    if (str(values.mitigation)) content.push({ heading: 'Mitigation Strategy', content: str(values.mitigation) });
    content.push({ heading: 'Status', content: str(values.status) });

    return {
      summary: truncate(str(values.description)),
      content,
      tags: ['risk', likelihood.toLowerCase(), impact.toLowerCase(), str(values.status).toLowerCase()],
    };
  },
};

const incidentReport: TemplateDefinition = {
  id: 'incident-report',
  name: 'Incident Report',
  description: 'Capture what happened, root cause, actions taken, and lessons learned.',
  icon: '🚨',
  format: 'procedure',
  fields: [
    { id: 'incident_date', label: 'Incident Date', type: 'date', required: true },
    { id: 'reported_by', label: 'Reported By', type: 'text', placeholder: 'Name of the person reporting', required: true },
    {
      id: 'severity',
      label: 'Severity',
      type: 'select',
      options: ['Low', 'Medium', 'High', 'Critical'],
      required: true,
    },
    { id: 'what_happened', label: 'What Happened', type: 'textarea', placeholder: 'Describe the incident in detail.', required: true },
    { id: 'root_cause', label: 'Root Cause', type: 'textarea', placeholder: 'What caused the incident?' },
    { id: 'immediate_actions', label: 'Immediate Actions Taken', type: 'list', itemPlaceholder: 'Add an action…' },
    { id: 'follow_up_actions', label: 'Follow-up Actions', type: 'list', itemPlaceholder: 'e.g. Review firewall rules — Jay — 2024-07-01' },
    { id: 'lessons_learned', label: 'Lessons Learned', type: 'textarea', placeholder: 'What can be improved to prevent recurrence?' },
  ],
  build(values) {
    const severity = str(values.severity);
    const date = str(values.incident_date);
    const reportedBy = str(values.reported_by);

    const content: DocumentSection[] = [
      {
        heading: 'Incident Details',
        content: `Date: ${date}\nReported By: ${reportedBy}\nSeverity: ${severity}`,
      },
      { heading: 'What Happened', content: str(values.what_happened) },
    ];
    if (str(values.root_cause)) content.push({ heading: 'Root Cause', content: str(values.root_cause) });
    if (list(values.immediate_actions).length) content.push({ heading: 'Immediate Actions Taken', items: list(values.immediate_actions) });
    if (list(values.follow_up_actions).length) content.push({ heading: 'Follow-up Actions', items: list(values.follow_up_actions) });
    if (str(values.lessons_learned)) content.push({ heading: 'Lessons Learned', content: str(values.lessons_learned) });

    return {
      summary: `${severity} severity incident on ${date} — ${truncate(str(values.what_happened), 80)}`,
      content,
      tags: ['incident', severity.toLowerCase()],
    };
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const TEMPLATES: TemplateDefinition[] = [
  sop,
  checklist,
  meetingMinutes,
  handoverNotes,
  riskRegister,
  incidentReport,
];

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
