Generate the markdown changelog body for the provided Gramadoc release version.

Rules:
- Read the most recent release notes you can find in the repo first, so the tone feels polished and continuous rather than generated from commits alone.
- Read recent git history and inspect the relevant project files before writing.
- Focus on what changed in Gramadoc itself: the editor, rule packs, release gates, API, React package, docs site, and developer workflow.
- Call out confusion-family precision changes explicitly when `your/you're`, `its/it's`, `whose/who's`, or `their/there/they're` behavior changed.
- Do not include front matter, metadata, or a leading `---`.
- Do not attempt to publish a release.
- You may use read-only commands to inspect files and git history if available.
- Write the markdown changelog body to `RELEASE.md`.
- Do not output any extra text.
- Start with a short, polished intro sentence.
- Use 3-5 top-level sections with emoji headings using `##`.
- Every top-level section must include at least one `###` subheading.
- Prefer short grouped bullet lists under subheadings instead of long flat sections.
- Bullets should be concrete, specific, and written in past tense.
- Keep the tone crisp, elegant, and product-facing, not like raw commit logs.
- Avoid dumping every commit; synthesize the story of the release into the most important improvements.
