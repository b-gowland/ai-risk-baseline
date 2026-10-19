/**
 * labels.js — plain-language UI text for the v2 answer model and result.
 *
 * answer-model.json holds the questions and value ids; value_help there is the source of
 * truth for the help it covers. This file adds the short labels every value needs, help the
 * model does not carry (Annex I safety component, scope exclusions), and the result labels.
 * scripts/tests/ui-v2-labels.test.js checks every model value has a label.
 */

export const UNSURE_LABEL = 'Unsure';

export const VALUE_LABELS = {
  common: { yes: 'Yes', no: 'No', unsure: UNSURE_LABEL },
  scope_exclusion: {
    none: 'None of these',
    military_defence_national_security: 'Military, defence or national security only',
    scientific_research_only: 'Scientific research and development only',
    pre_market_research: 'Research, testing or development before it is placed on the market or put into service',
    personal_non_professional: 'Personal, non-professional use by an individual',
    free_open_source: 'Released under a free and open-source licence',
  },
  role: {
    build_own_use: 'We build it and use it ourselves',
    build_supply: 'We build it and supply it to others',
    deploy_vendor: 'We use a system made by someone else',
    put_name_on_or_substantially_modify: 'We rebrand or substantially modify a vendor system',
    repurpose_to_high_risk: 'We use a vendor system for a high-risk purpose it was not meant for',
    import_or_distribute: 'We import or distribute it in the EU',
    gpai_model_provider: 'We develop and release a general-purpose AI model',
  },
  org_type: {
    private: 'Private organisation',
    private_public_service: 'Private organisation providing a public service',
    public_authority: 'Public authority',
  },
  org_size: {
    sme: 'SME (fewer than 250 staff)',
    small_mid_cap: 'Small mid-cap (fewer than 750 staff)',
    large: 'Larger organisation',
  },
  art_6_3: {
    narrow_procedural: 'Narrow procedural task',
    improves_completed_human_activity: 'Improves a completed human activity',
    pattern_detection_with_review: 'Detects patterns, with human review',
    preparatory: 'Preparatory task',
    profiling: 'Profiles people',
  },
  interaction: {
    interacts_directly: 'Interacts directly with people (e.g. a chatbot)',
    generates_synthetic_content: 'Generates or alters audio, images, video or text',
    deepfake: 'Produces deepfakes (realistic content showing real people, places or events)',
    public_interest_text: 'Publishes AI-generated text informing the public on matters of public interest, without human editorial review',
    emotion_or_biometric_categorisation: 'Recognises emotions or sorts people by biometric data',
  },
  autonomy: {
    human_decides: 'A person decides every case',
    human_oversight: 'It decides; people review or can override',
    autonomous: 'It acts on its own',
  },
  severity: {
    negligible: 'Negligible',
    minor: 'Minor inconvenience',
    material: 'Financial loss or lost access to a service or opportunity',
    serious: 'Legal effects, health or safety, or fundamental rights',
  },
  affected: {
    staff: 'Staff',
    customers: 'Customers',
    public: 'Members of the public',
    vulnerable_or_children: 'Vulnerable people or children',
  },
  data: {
    none: 'No personal data',
    personal: 'Personal data',
    special_category: 'Special-category data (health, ethnicity, beliefs…)',
    biometric: 'Biometric data',
    children: "Children's data",
  },
  tech: {
    classical_ml: 'Classical machine learning',
    llm_genai: 'Large language model or generative AI',
    agent_tools: 'Agent that uses tools or takes actions',
    vision_biometric: 'Computer vision or biometrics',
    third_party_model: 'Third-party model or API',
  },
  stage: {
    idea: 'Idea',
    build: 'Being built or procured',
    pre_deploy: 'About to go live',
    live: 'Live',
  },
};

/** Short field titles (the model's 'question' is the full prompt). */
export const FIELD_TITLES = {
  purpose: 'Intended purpose',
  prohibited: 'Prohibited-practice screen',
  eu_nexus: 'EU connection',
  scope_exclusion: 'Exclusions',
  role: 'Your role',
  org_type: 'Organisation type',
  org_size: 'Organisation size',
  annex_i_product: 'Regulated product',
  art_6_3: 'Art. 6(3) screen',
  interaction: 'Interaction and content',
  autonomy: 'Autonomy',
  severity: 'Worst plausible harm',
  reversible: 'Reversible',
  affected: 'Affected people',
  data: 'Data',
  tech: 'Technology',
  stage: 'Lifecycle stage',
  ai_policy_inventory: 'AI policy and inventory',
};

/** Help the model does not carry. Shown under the question. */
export const FIELD_HELP = {
  purpose: 'Pick what the system is for, not how it works. The EU AI Act classifies by purpose; the technology never changes the legal result.',
  eu_nexus: 'Yes if it is sold, supplied or used in the EU, or its outputs are used there, wherever your organisation is based.',
  scope_exclusion: 'Only pick one if it applies exclusively. Real-world testing is not covered by the research exclusion. Open-source systems stay in scope if they turn out prohibited, high-risk or subject to transparency duties.',
  role: 'Pick every role that applies. Building on a third-party model through its API does not make you a general-purpose model provider.',
  org_type: 'Public authority includes bodies acting on its behalf.',
  org_size: 'SME and small mid-cap status does not remove obligations, but it simplifies some of them.',
  annex_i_product: 'A safety component is one whose purpose is to prevent or reduce risks to health and safety. Systems used only for non-safety assistance, optimisation, efficiency, automation, convenience or quality control are not safety components, unless their failure would endanger health and safety. A third-party conformity assessment needed only for other risks (e.g. radio spectrum) does not count. Vehicles, aviation, marine, rail and machinery are covered through their own sector rules and are not classified here.',
  art_6_3: 'An Annex III system is not high-risk if it only does one of the first four things and does not profile people. This is the provider\'s assessment and must be documented.',
  interaction: 'Leave all unticked, or choose "None of these", if none applies.',
  reversible: 'Easily detected and put right before it causes lasting harm.',
  data: 'Pick every type that applies.',
  tech: 'Used only for technical risk considerations.',
  ai_policy_inventory: 'Shapes the organisation-level actions in your baseline.',
};

export const FIELD_QUESTIONS = {
  // The model's question is used where this has no entry.
  art_6_3: 'Does the system only do one of these, and does it profile people?',
};

export const GATES = [
  { id: 'purpose', label: 'Purpose', fields: ['purpose'] },
  { id: 'prohibited', label: 'Prohibited screen', fields: ['prohibited'] },
  { id: 'scope', label: 'Scope', fields: ['eu_nexus', 'scope_exclusion'] },
  { id: 'role', label: 'Role', fields: ['role', 'org_type', 'org_size'] },
  { id: 'product', label: 'Product', fields: ['annex_i_product'] },
  { id: 'art_6_3', label: 'Art. 6(3)', fields: ['art_6_3'] },
  { id: 'transparency', label: 'Transparency', fields: ['interaction'] },
  { id: 'impact', label: 'Impact', fields: ['autonomy', 'severity', 'reversible', 'affected'] },
  { id: 'data_tech', label: 'Data and tech', fields: ['data', 'tech'] },
  { id: 'stage', label: 'Stage', fields: ['stage', 'ai_policy_inventory'] },
  { id: 'review', label: 'Review', fields: [] },
];

export function valueLabel(fieldId, value) {
  return (VALUE_LABELS[fieldId] || {})[value] || VALUE_LABELS.common[value] || value;
}

// ── Result labels ──

export const STATUS_LABELS = {
  prohibited: 'Prohibited',
  high_risk: 'High-risk',
  not_high_risk_6_3: 'Not high-risk under Art. 6(3): document it',
  transparency: 'Transparency obligations only',
  minimal: 'Minimal risk',
  out_of_scope: 'Out of scope of the EU AI Act',
};

export const SCOPE_LABELS = { in: 'In scope', out: 'Out of scope', undetermined: 'Scope undetermined' };

export const ROLE_LABELS = {
  provider: 'Provider',
  deployer: 'Deployer',
  importer_distributor: 'Importer or distributor',
  gpai_provider: 'General-purpose AI model provider',
};

export const GATE_LABELS = {
  classify: 'Classify',
  design: 'Design',
  build: 'Build',
  pre_deploy: 'Before go-live',
  operate: 'Operate',
};
export const REQUIREMENT_GATES = Object.keys(GATE_LABELS);

/** How an open question is put to the person who can answer it. */
export const OPEN_QUESTION_TEXT = {
  purpose: { ask: 'What exactly is the system\'s intended purpose?', who: 'Business owner' },
  'prohibited': { ask: 'Could the system fall under the prohibited practice "{title}"?', who: 'Legal' },
  eu_nexus: { ask: 'Will the system or its outputs be placed on the market or used in the EU?', who: 'Legal' },
  scope_exclusion: { ask: 'Does an Art. 2 exclusion apply exclusively to this system?', who: 'Legal' },
  role: { ask: 'What is our role for this system: provider, deployer or both?', who: 'Legal and procurement' },
  annex_i: { ask: 'Is the AI a safety component of a product that needs third-party conformity assessment?', who: 'Product compliance' },
  annex_iii_condition: { ask: 'Is the system used by or on behalf of a public authority?', who: 'Legal' },
  art_6_3: { ask: 'Does the Art. 6(3) derogation apply, and does the system profile people?', who: 'Provider (vendor) or Legal' },
  org_type: { ask: 'Are we a public authority, or a private body providing a public service?', who: 'Legal' },
  severity: { ask: 'What is the worst plausible harm to a person if it gets it wrong?', who: 'Risk owner' },
  autonomy: { ask: 'How much does a human control each outcome?', who: 'Tech lead' },
  reversible: { ask: 'Can harm be easily detected and reversed?', who: 'Risk owner' },
  gpai_systemic: { ask: 'Does the general-purpose model meet the systemic-risk threshold (Art. 51)?', who: 'Tech lead and Legal' },
};
