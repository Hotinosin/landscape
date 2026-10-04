# Development constraints

- Never compile, check, test, format, or lint Rust on the local Mac.
- Run all Rust and Cargo commands inside the OrbStack Ubuntu VM. If the VM is unavailable, leave Rust unverified and state that explicitly.
- Use Bun for frontend dependency management, development, tests, and builds.
- Use `uv` for Python dependencies and virtual environments; do not use `python -m venv` or Conda.
