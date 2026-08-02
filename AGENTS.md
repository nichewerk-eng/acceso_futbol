<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-home-fix -->
# Git in agent shells

If `HOME` is not `/Users/jondev`, export it before `git commit` / `git push`. A broken relative `HOME` (e.g. `1356`) blocks osxkeychain GitHub auth.
<!-- END:git-home-fix -->
