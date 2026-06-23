from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def naive_utc_now() -> datetime:
    """Return the current UTC datetime without timezone info.

    Use this when binding datetimes in SQL queries against SQLite DateTime
    columns, which store and return naive values.
    """
    return utc_now().replace(tzinfo=None)


def ensure_utc(dt: Optional[datetime]) -> datetime:
    """Return a timezone-aware UTC datetime.

    SQLite stores DateTime values without timezone info, so values loaded from
    the database are treated as UTC. Values that already carry a timezone are
    converted to UTC.
    """
    if dt is None:
        return utc_now()
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
