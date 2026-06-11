/**
 * markdown-export.js
 * Converts buildOutput() result to a Markdown string suitable for
 * pasting into Confluence, Notion, or any Markdown-capable tool.
 */

export function buildMarkdownExport(output, config, today = new Date()) {
  const lines = []
  const dateStr = today.toISOString().slice(0, 10)

  lines.push(`# AI Governance Baseline`)
  lines.push(``)
  lines.push(`**Generated:** ${dateStr} · [AI Risk Practice Baseline](https://baseline.airiskpractice.org/)`)
  lines.push(``)
  lines.push(`> **Disclaimer:** This output is a starting point — not legal advice.`)
  lines.push(`> Every citation should be verified against the primary source before use in a governance artefact.`)
  lines.push(`> [Full disclaimer →](https://baseline.airiskpractice.org/disclaimer)`)
  lines.push(``)

  // Config summary
  lines.push(`## Configuration`)
  lines.push(``)
  if (config.system_type) lines.push(`- **System type:** ${config.system_type}`)
  if (config.context?.domain?.length) lines.push(`- **Domain:** ${config.context.domain.join(`, `)}`)
  if (config.context?.who?.length) lines.push(`- **Users:** ${config.context.who.join(`, `)}`)
  if (config.context?.decision_mode?.length) lines.push(`- **Decision mode:** ${config.context.decision_mode.join(`, `)}`)
  if (config.context?.build_path) lines.push(`- **Build path:** ${config.context.build_path}`)
  if (config.data?.data_type?.length) lines.push(`- **Data types:** ${config.data.data_type.join(`, `)}`)
  if (config.data?.data_scale) lines.push(`- **Data scale:** ${config.data.data_scale}`)
  if (config.jurisdiction?.length) lines.push(`- **Jurisdictions:** ${config.jurisdiction.join(`, `)}`)
  if (config.platform) lines.push(`- **Platform:** ${config.platform}`)
  lines.push(``)

  if (output.isBroad) {
    lines.push(`> ⚠️ Some answers were unspecified — output is broader than it could be.`)
    lines.push(`> [Refine your configuration →](https://baseline.airiskpractice.org/configure)`)
    lines.push(``)
  }

  // Risks
  if (output.risks?.length) {
    lines.push(`## Risk Profile`)
    lines.push(``)
    lines.push(`Top risks for this configuration, ranked by relevance.`)
    lines.push(``)
    output.risks.forEach((r, i) => {
      lines.push(`### ${i + 1}. ${r.title}`)
      lines.push(``)
      if (r.description) lines.push(r.description)
      if (r.kb_ref) {
        lines.push(``)
        lines.push(`[View in Knowledge Base →](https://library.airiskpractice.org/docs/${r.kb_ref})`)
      }
      lines.push(``)
    })
  }

  // Regulatory
  if (output.regulatory?.length) {
    lines.push(`## Regulatory Requirements`)
    lines.push(``)

    // Group by framework
    const byFramework = output.regulatoryByFramework || {}
    const frameworkOrder = Object.keys(byFramework)

    if (frameworkOrder.length > 0) {
      frameworkOrder.forEach(fw => {
        const items = byFramework[fw]
        if (!items?.length) return
        const frameworkName = items[0]?.framework_name || fw
        lines.push(`### ${frameworkName}`)
        lines.push(``)
        items.forEach(item => {
          const badge = item.obligation_level === `mandatory` ? `**MANDATORY**` : `*Recommended*`
          const dateNote = item.effective_label ? ` · ${item.effective_label}` : ``
          lines.push(`**${item.article_ref}** — ${item.requirement}`)
          lines.push(``)
          lines.push(`${badge}${dateNote}`)
          if (item._source_note) lines.push(``)
          if (item._source_note) lines.push(`*Source: ${item._source_note}*`)
          if (item.source_url) lines.push(`[Primary source →](${item.source_url})`)
          lines.push(``)
        })
      })
    } else {
      output.regulatory.forEach(item => {
        lines.push(`**${item.article_ref}** — ${item.requirement}`)
        lines.push(``)
      })
    }
  }

  // Controls
  if (output.controls?.length) {
    lines.push(`## Controls`)
    lines.push(``)
    lines.push(`Controls are grouped by function. Effort: Low / Medium / High.`)
    lines.push(``)

    const byFunction = output.controlsByFunction || {}
    const functions = [`risk`, `legal`, `tech`, `procurement`]
    const functionLabels = { risk: `Risk`, legal: `Legal`, tech: `Technology`, procurement: `Procurement` }

    functions.forEach(fn => {
      const items = byFunction[fn] || []
      if (!items.length) return
      lines.push(`### ${functionLabels[fn]}`)
      lines.push(``)
      items.forEach(ctrl => {
        lines.push(`**${ctrl.title}**`)
        lines.push(``)
        if (ctrl.description) lines.push(ctrl.description)
        const meta = []
        if (ctrl.effort) meta.push(`Effort: ${ctrl.effort}`)
        if (ctrl.owner) meta.push(`Owner: ${ctrl.owner}`)
        if (meta.length) lines.push(``)
        if (meta.length) lines.push(meta.join(` · `))
        if (ctrl.frameworks?.length) {
          lines.push(``)
          lines.push(`Frameworks: ${ctrl.frameworks.join(`, `)}`)
        }
        lines.push(``)
      })
    })
  }

  // Actions
  if (output.actions?.length) {
    lines.push(`## Prioritised Actions`)
    lines.push(``)
    lines.push(`Top ${output.actions.length} next steps for this configuration.`)
    lines.push(``)
    output.actions.forEach((action, i) => {
      lines.push(`**${i + 1}. ${action.title}**`)
      lines.push(``)
      if (action.description) lines.push(action.description)
      const meta = []
      if (action.owner) meta.push(`Owner: ${action.owner}`)
      if (action.effort) meta.push(`Effort: ${action.effort}`)
      if (meta.length) lines.push(``)
      if (meta.length) lines.push(meta.join(` · `))
      lines.push(``)
    })
  }

  lines.push(`---`)
  lines.push(``)
  lines.push(`*Generated by [AI Risk Practice Baseline](https://baseline.airiskpractice.org/) · Apache 2.0 open source · Content CC BY 4.0*`)

  return lines.join(`\n`)
}
