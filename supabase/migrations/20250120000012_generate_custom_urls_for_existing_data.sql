-- Generate custom URLs for existing data
-- This migration will create custom URLs for all existing events, galleries, and tokens

-- Function to extract client name from event name
CREATE OR REPLACE FUNCTION extract_client_name(event_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN generate_url_slug(
    regexp_replace(
      event_name, 
      '\s+(headshot|headshots|event|events|photos|team|corporate|session|shoot).*$', 
      '', 
      'gi'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to generate employee slug (first name + last initial)
CREATE OR REPLACE FUNCTION generate_employee_slug(employee_name TEXT)
RETURNS TEXT AS $$
DECLARE
  name_parts TEXT[];
  first_name TEXT;
  last_initial TEXT;
BEGIN
  name_parts := string_to_array(trim(employee_name), ' ');
  
  IF array_length(name_parts, 1) = 1 THEN
    RETURN generate_url_slug(name_parts[1]);
  END IF;
  
  first_name := name_parts[1];
  last_initial := substring(name_parts[array_length(name_parts, 1)], 1, 1);
  
  RETURN generate_url_slug(first_name || '-' || last_initial);
END;
$$ LANGUAGE plpgsql;

-- Generate custom URLs for existing headshot events
INSERT INTO custom_urls (original_id, type, custom_slug, client_name)
SELECT 
  id,
  'headshot_event',
  ensure_unique_custom_url(
    extract_client_name(event_name),
    extract_client_name(event_name),
    'headshot_event',
    id
  ),
  extract_client_name(event_name)
FROM headshot_events
WHERE id NOT IN (SELECT original_id FROM custom_urls WHERE type = 'headshot_event');

-- Generate custom URLs for existing employee galleries
INSERT INTO custom_urls (original_id, type, custom_slug, client_name)
SELECT 
  eg.id,
  'employee_gallery',
  ensure_unique_custom_url(
    extract_client_name(he.event_name),
    generate_employee_slug(eg.employee_name),
    'employee_gallery',
    eg.id
  ),
  extract_client_name(he.event_name)
FROM employee_galleries eg
JOIN headshot_events he ON eg.event_id = he.id
WHERE eg.id NOT IN (SELECT original_id FROM custom_urls WHERE type = 'employee_gallery');

-- Generate custom URLs for existing photographer tokens
INSERT INTO custom_urls (original_id, type, custom_slug, client_name)
SELECT 
  id,
  'photographer_token',
  ensure_unique_custom_url(
    'photographers',
    generate_employee_slug(photographer_name),
    'photographer_token',
    id
  ),
  'photographers'
FROM photographer_tokens
WHERE id NOT IN (SELECT original_id FROM custom_urls WHERE type = 'photographer_token');

-- Generate custom URLs for existing proposals (if any)
INSERT INTO custom_urls (original_id, type, custom_slug, client_name)
SELECT 
  id,
  'proposal',
  ensure_unique_custom_url(
    'client',
    'proposal-' || substring(id::text, 1, 8),
    'proposal',
    id
  ),
  'client'
FROM proposals
WHERE id NOT IN (SELECT original_id FROM custom_urls WHERE type = 'proposal');

