from pathlib import Path

from app.scanner.deep_analyzer import analyze_quality, analyze_readme, analyze_security, extract_api_routes


def test_repository_evidence_analyzers(tmp_path: Path) -> None:
    (tmp_path / 'README.md').write_text('# Demo\n\n## Installation\nInstall it.\n\n## Usage\nUse it.\n', encoding='utf-8')
    (tmp_path / 'package.json').write_text('{}', encoding='utf-8')
    source = tmp_path / 'app.py'
    source.write_text('@app.get(chr(47) + chr(34))\ndef home():\n    pass\n', encoding='utf-8')
    (tmp_path / 'test_app.py').write_text('def test_home(): pass\n', encoding='utf-8')

    readme = analyze_readme(tmp_path)
    quality = analyze_quality(tmp_path)

    assert readme['exists'] is True
    assert readme['sections']['installation'] is True
    assert quality['has_tests'] is True
    assert 'package.json' in quality['build_files']
    assert analyze_security(tmp_path)['finding_count'] == 0


def test_route_extraction(tmp_path: Path) -> None:
    quote = chr(34)
    (tmp_path / 'api.py').write_text('@router.post(' + quote + '/items' + quote + ')\ndef create(): pass\n', encoding='utf-8')
    routes = extract_api_routes(tmp_path)
    assert routes[0]['method'] == 'POST'
    assert routes[0]['path'] == '/items'
