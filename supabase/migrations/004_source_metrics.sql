-- Add source_metrics column to contact_results table for VC pitch analytics
ALTER TABLE contact_results 
ADD COLUMN IF NOT EXISTS source_metrics JSONB;

-- Create index for source metrics queries
CREATE INDEX IF NOT EXISTS idx_contact_results_source_metrics 
ON contact_results USING GIN (source_metrics);

-- Add comment for documentation
COMMENT ON COLUMN contact_results.source_metrics IS 'Tracks unique sources used in research for VC pitch metrics';