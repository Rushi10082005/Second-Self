---
capture_id: fc03fe78-a34c-4a4c-9d39-93d1a0002b06
links: []
para_category: Resources
summary: Best practices for executing subprocesses and background processes in Python,
  including avoiding blocking calls and handling process exit codes.
tags:
- python
- subprocess
- async
title: Python Subprocess Guidance
---

# Python Subprocess & Async Guidance
Best practices for subagents and background process execution:
* Avoid blocking the main event loop with synchronous wait calls
* Use reactive notifications upon process exit code completion
* Capture stdin, stdout, stderr cleanly with UTF-8 decoding
