from backend.adapters.espn_nba import map_espn_event


def test_map_espn_event_includes_both_teams_quarter_scores():
    event = {
        'id': '123',
        'date': '2026-10-29T00:00:00Z',
        'status': {'type': {'name': 'STATUS_FINAL', 'completed': True, 'state': 'post', 'detail': 'Final'}},
        'competitions': [{
            'venue': {'fullName': 'Test Arena'},
            'competitors': [
                {
                    'homeAway': 'home',
                    'score': '110',
                    'team': {'abbreviation': 'HOM', 'name': 'Home', 'logo': ''},
                    'linescores': [
                        {'period': 1, 'displayValue': '25'},
                        {'period': 2, 'displayValue': '30'},
                        {'period': 3, 'displayValue': '28'},
                        {'period': 4, 'displayValue': '22'},
                        {'period': 5, 'displayValue': '5'},
                    ],
                },
                {
                    'homeAway': 'away',
                    'score': '105',
                    'team': {'abbreviation': 'AWY', 'name': 'Away', 'logo': ''},
                    'linescores': [
                        {'period': 1, 'displayValue': '24'},
                        {'period': 2, 'displayValue': '29'},
                        {'period': 3, 'displayValue': '27'},
                        {'period': 4, 'displayValue': '20'},
                        {'period': 5, 'displayValue': '5'},
                    ],
                },
            ],
        }],
    }

    result = map_espn_event(event)

    assert result['homeQuarters'] == [25, 30, 28, 22]
    assert result['awayQuarters'] == [24, 29, 27, 20]
    assert result['homeOvertime'] == 5
    assert result['awayOvertime'] == 5