-- Migration: Unify Contact Format
-- Date: 2024-12-24
-- Purpose: Convert all legacy single-contact formats to unified dual-contact format
--
-- This migration ensures all contact information follows the new ContactSchema:
-- {
--   primary_contact: { name, title, email?, inferred, confidence_score, contact_type: "hiring", source? },
--   secondary_contact: { name, title, email?, inferred, confidence_score, contact_type: "leadership", source? }
-- }
--
-- Legacy formats handled:
-- 1. Single contact: { name, title, email?, inferred, source? }
-- 2. Partial dual: { primary_contact: {...}, secondary_contact?: {...} }

-- Step 1: Update verified_json in contact_results table
UPDATE contact_results
SET verified_json = jsonb_set(
  verified_json,
  '{contact}',
  CASE
    -- Already has unified format with both contacts
    WHEN verified_json->'contact'->'primary_contact' IS NOT NULL
      AND verified_json->'contact'->'secondary_contact' IS NOT NULL
      THEN verified_json->'contact'

    -- Has primary but missing secondary - add placeholder secondary
    WHEN verified_json->'contact'->'primary_contact' IS NOT NULL
      AND verified_json->'contact'->'secondary_contact' IS NULL
      THEN jsonb_build_object(
        'primary_contact', verified_json->'contact'->'primary_contact',
        'secondary_contact', jsonb_build_object(
          'name', 'N/A',
          'title', 'N/A',
          'confidence_score', 0.0,
          'contact_type', 'leadership',
          'inferred', true
        )
      )

    -- Legacy single contact format - convert to dual
    ELSE jsonb_build_object(
      'primary_contact', jsonb_build_object(
        'name', COALESCE(verified_json->'contact'->>'name', 'N/A'),
        'title', COALESCE(verified_json->'contact'->>'title', 'N/A'),
        'email', verified_json->'contact'->>'email',
        'inferred', COALESCE((verified_json->'contact'->>'inferred')::boolean, true),
        'confidence_score', COALESCE((verified_json->'contact'->>'confidence_score')::numeric, 0.5),
        'contact_type', 'hiring',
        'source', verified_json->'contact'->'source'
      ),
      'secondary_contact', jsonb_build_object(
        'name', 'N/A',
        'title', 'N/A',
        'confidence_score', 0.0,
        'contact_type', 'leadership',
        'inferred', true
      )
    )
  END
)
WHERE verified_json->'contact' IS NOT NULL;

-- Step 2: Update research_json in runs table
UPDATE runs
SET research_json = jsonb_set(
  research_json,
  '{contact_information}',
  CASE
    -- Already has unified format
    WHEN research_json->'contact_information'->'primary_contact' IS NOT NULL
      AND research_json->'contact_information'->'secondary_contact' IS NOT NULL
      THEN research_json->'contact_information'

    -- Has primary but missing secondary
    WHEN research_json->'contact_information'->'primary_contact' IS NOT NULL
      AND research_json->'contact_information'->'secondary_contact' IS NULL
      THEN jsonb_build_object(
        'primary_contact', research_json->'contact_information'->'primary_contact',
        'secondary_contact', jsonb_build_object(
          'name', 'N/A',
          'title', 'N/A',
          'confidence_score', 0.0,
          'contact_type', 'leadership',
          'inferred', true
        )
      )

    -- Legacy single contact - convert to dual
    ELSE jsonb_build_object(
      'primary_contact', jsonb_build_object(
        'name', COALESCE(research_json->'contact_information'->>'name', 'N/A'),
        'title', COALESCE(research_json->'contact_information'->>'title', 'N/A'),
        'email', research_json->'contact_information'->>'email',
        'inferred', COALESCE((research_json->'contact_information'->>'inferred')::boolean, true),
        'confidence_score', COALESCE((research_json->'contact_information'->>'confidence_score')::numeric, 0.5),
        'contact_type', 'hiring',
        'source', research_json->'contact_information'->'source'
      ),
      'secondary_contact', jsonb_build_object(
        'name', 'N/A',
        'title', 'N/A',
        'confidence_score', 0.0,
        'contact_type', 'leadership',
        'inferred', true
      )
    )
  END
)
WHERE research_json->'contact_information' IS NOT NULL;

-- Step 3: Update verified_json in runs table
UPDATE runs
SET verified_json = jsonb_set(
  verified_json,
  '{contact}',
  CASE
    -- Already unified
    WHEN verified_json->'contact'->'primary_contact' IS NOT NULL
      AND verified_json->'contact'->'secondary_contact' IS NOT NULL
      THEN verified_json->'contact'

    -- Has primary, missing secondary
    WHEN verified_json->'contact'->'primary_contact' IS NOT NULL
      AND verified_json->'contact'->'secondary_contact' IS NULL
      THEN jsonb_build_object(
        'primary_contact', verified_json->'contact'->'primary_contact',
        'secondary_contact', jsonb_build_object(
          'name', 'N/A',
          'title', 'N/A',
          'confidence_score', 0.0,
          'contact_type', 'leadership',
          'inferred', true
        )
      )

    -- Legacy single contact
    ELSE jsonb_build_object(
      'primary_contact', jsonb_build_object(
        'name', COALESCE(verified_json->'contact'->>'name', 'N/A'),
        'title', COALESCE(verified_json->'contact'->>'title', 'N/A'),
        'email', verified_json->'contact'->>'email',
        'inferred', COALESCE((verified_json->'contact'->>'inferred')::boolean, true),
        'confidence_score', COALESCE((verified_json->'contact'->>'confidence_score')::numeric, 0.5),
        'contact_type', 'hiring',
        'source', verified_json->'contact'->'source'
      ),
      'secondary_contact', jsonb_build_object(
        'name', 'N/A',
        'title', 'N/A',
        'confidence_score', 0.0,
        'contact_type', 'leadership',
        'inferred', true
      )
    )
  END
)
WHERE verified_json->'contact' IS NOT NULL;

-- Verification: Count records that were updated
DO $$
DECLARE
  contact_results_count INTEGER;
  runs_research_count INTEGER;
  runs_verified_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO contact_results_count
  FROM contact_results
  WHERE verified_json->'contact'->'primary_contact' IS NOT NULL;

  SELECT COUNT(*) INTO runs_research_count
  FROM runs
  WHERE research_json->'contact_information'->'primary_contact' IS NOT NULL;

  SELECT COUNT(*) INTO runs_verified_count
  FROM runs
  WHERE verified_json->'contact'->'primary_contact' IS NOT NULL;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  contact_results records with unified format: %', contact_results_count;
  RAISE NOTICE '  runs.research_json records with unified format: %', runs_research_count;
  RAISE NOTICE '  runs.verified_json records with unified format: %', runs_verified_count;
END $$;
