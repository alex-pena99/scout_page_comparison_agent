import copy
import unittest

from compare import GAP_FIELDS, decide


CAPTURE = {'states': {'baseline': {
    'visibleText': 'Fiber Internet $35/month $45/month SAVE save '
                   '60-day money-back guarantee 12 months 24 months',
    'png': None,
}}}


def side(fields, unknown=(), unreadable=False):
    offers = [{'id': 'internet', 'state': 'baseline', 'fields': fields, 'unknown': unknown}] if fields or unknown else []
    return {'finding': 'Fiber headline', 'offers': offers,
            'gaps': [{name: 'headline price image unreadable' for name in GAP_FIELDS}] if unreadable else [],
            'evidence': [{'state': 'baseline', 'quotes': ['Fiber Internet']}]}


class HeadlineComparisonTest(unittest.TestCase):
    def setUp(self):
        self.available = {'vanity': CAPTURE, 'tracking': CAPTURE}
        self.same = {'prices': ['$35/month'], 'benefits': ['60-day money-back guarantee']}
        self.review = {'correspondence': 'corresponding',
                       'vanity': side(self.same), 'tracking': side(copy.deepcopy(self.same))}

    def status(self):
        return decide(self.review, self.available, ['Tracking page unavailable'])[0]

    def test_equivalent_wording_and_unchecked_guarantee_terms(self):
        self.review['tracking'] = side({'prices': ['$ 35.00 per mo.'],
                                        'benefits': ['60-day Money-back Guarantee.']})
        self.assertEqual(self.status(), 'Match')

    def test_price_modifier_code_and_direct_duration(self):
        for field, left, right in [('prices', '$35/month', '$45/month'),
                                   ('prices', 'from $35/month', '$35/month'),
                                   ('prices', '$35/month', '$35/line'),
                                   ('promo_codes', 'SAVE', 'save'),
                                   ('durations', '12 months', '24 months')]:
            with self.subTest(field=field, right=right):
                self.review['vanity'] = side({field: [left]})
                self.review['tracking'] = side({field: [right]})
                self.assertEqual(self.status(), 'Mismatch')

    def test_absence_requires_readable_correspondence(self):
        self.review['tracking'] = side({})
        self.assertEqual(self.status(), 'Mismatch')
        self.review['tracking'] = side({}, unreadable=True)
        self.assertEqual(self.status(), 'Needs Review')
        self.review['correspondence'] = 'unrelated'
        self.review['reason'] = 'Tracking is a support page'
        self.assertEqual(self.status(), 'Needs Review')

    def test_unreadable_and_unavailable(self):
        self.review['tracking'] = side({}, ('prices',), unreadable=True)
        self.assertEqual(self.status(), 'Needs Review')
        self.available['tracking'] = None
        self.assertEqual(self.status(), 'Needs Review')

    def test_independent_mismatch_survives_unreadable_field(self):
        self.review['vanity'] = side({'prices': ['$35/mo'], 'durations': ['12 months']})
        self.review['tracking'] = side({'durations': ['24 months']}, ('prices',), unreadable=True)
        self.assertEqual(self.status(), 'Mismatch')

    def test_raw_clauses_and_legacy_requirements_are_not_comparison_fields(self):
        self.review['tracking'] = side({'requirements': ['AutoPay required throughout']})
        with self.assertRaisesRegex(ValueError, 'invalid fields'):
            self.status()

    def test_quote_must_exist_in_current_visible_evidence(self):
        self.review['tracking']['evidence'][0]['quotes'] = ['Only in an older capture']
        with self.assertRaisesRegex(ValueError, 'does not appear'):
            self.status()

    def test_saved_capture_requires_coverage_and_preserves_independent_difference(self):
        self.available = {role: {**capture, 'entry': {}} for role, capture in self.available.items()}
        with self.assertRaisesRegex(ValueError, 'explicit banner and primary-view'):
            self.status()
        self.review['vanity']['coverage'] = {
            'banner': 'clear', 'primary_views': 'complete', 'basis': 'All captured primary offers inspected'}
        self.review['tracking']['coverage'] = {
            'banner': 'obstructed', 'primary_views': 'incomplete', 'basis': 'Cookie banner covers primary text'}
        with self.assertRaisesRegex(ValueError, 'needs a necessary evidence gap'):
            self.status()
        self.review['tracking']['gaps'] = [{name: 'wireless primary view missing' for name in GAP_FIELDS}]
        self.assertEqual(self.status(), 'Needs Review')
        self.review['tracking']['offers'][0]['fields']['prices'] = ['$45/month']
        self.assertEqual(self.status(), 'Mismatch')

    def test_saved_capture_with_only_empty_offers_cannot_match(self):
        self.available = {role: {**capture, 'entry': {}} for role, capture in self.available.items()}
        for role in self.available:
            self.review[role] = side({'prices': []})
            self.review[role]['coverage'] = {
                'banner': 'clear', 'primary_views': 'complete', 'basis': 'Reviewed the saved baseline'}
        self.assertEqual(self.status(), 'Needs Review')


if __name__ == '__main__':
    unittest.main()
