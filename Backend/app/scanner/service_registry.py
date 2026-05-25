from pathlib import Path

from app.scanner.scanner_service import ScannerService

scanner_service = ScannerService(Path.cwd())
