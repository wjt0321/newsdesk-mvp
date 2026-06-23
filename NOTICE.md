# Notices and Acknowledgements

NewsDesk MVP is built on top of open-source software. We are grateful to the maintainers and communities behind these projects.

## Core Runtime and Frameworks

- [FastAPI](https://fastapi.tiangolo.com/) — backend web framework.
- [Starlette](https://www.starlette.io/) and [Uvicorn](https://www.uvicorn.org/) — ASGI toolkit and server used by FastAPI.
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM and database toolkit.
- [Pydantic](https://docs.pydantic.dev/) and [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) — data validation and configuration.
- [APScheduler](https://apscheduler.readthedocs.io/) — background scheduling.

## News Fetching and Text Processing

- [feedparser](https://feedparser.readthedocs.io/) — RSS/Atom parsing.
- [httpx](https://www.python-httpx.org/) — HTTP client.
- [python-dateutil](https://dateutil.readthedocs.io/) — date parsing utilities.
- [RapidFuzz](https://rapidfuzz.github.io/RapidFuzz/) — fuzzy string matching for story clustering.

## Frontend and Desktop

- [React](https://react.dev/) — frontend UI library.
- [Vite](https://vite.dev/) — frontend build tooling.
- [TypeScript](https://www.typescriptlang.org/) — typed JavaScript.
- [Tailwind CSS](https://tailwindcss.com/) — utility-first CSS framework.
- [TanStack Query](https://tanstack.com/query/latest) — frontend server-state management.
- [React Router](https://reactrouter.com/) — frontend routing.
- [Axios](https://axios-http.com/) — browser HTTP client.
- [lucide-react](https://lucide.dev/) — icon components.
- [Tauri](https://tauri.app/) — desktop application shell.

## Tooling

- [pytest](https://docs.pytest.org/) — backend tests.
- [ESLint](https://eslint.org/) and TypeScript ESLint — frontend linting.
- [PyInstaller](https://pyinstaller.org/) — optional backend sidecar packaging.

## Design Influence

The project direction was informed by common patterns from RSS readers, personal dashboards, and news intelligence workflows. Any third-party project names, logos, feeds, or trademarks referenced by NewsDesk remain the property of their respective owners.

## License Notes

This repository does not vendor third-party source code directly. Runtime dependencies are installed through Python, npm, and Cargo package managers and remain governed by their own licenses. Please review upstream license terms before redistributing packaged builds.
