# API Documentation

## Overview

Outreach.ai provides a comprehensive REST API for company research, contact discovery, and outreach automation.

## Base URL

```
Production: https://your-domain.vercel.app/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via Supabase Auth. Include the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Endpoints

### Company Autocomplete

**GET** `/api/company-autocomplete`

Search for companies with autocomplete suggestions.

**Query Parameters:**
- `query` (string, required): Company name to search

**Response:**
```json
{
  "companies": [
    {
      "name": "Company Name",
      "domain": "company.com",
      "description": "Company description"
    }
  ]
}
```

### Run Research

**POST** `/api/run`

Execute the complete research and outreach pipeline.

**Request Body:**
```json
{
  "company": "Company Name",
  "domain": "company.com",
  "role": "Software Engineer",
  "highlights": "Technical background, open source contributor"
}
```

**Response:**
```json
{
  "research": {
    "company_overview": "...",
    "key_business_points": {...},
    "confidence_assessment": {...}
  },
  "contact": {
    "name": "John Doe",
    "title": "CTO",
    "email": "john@company.com"
  },
  "outputs": {
    "email": "Generated email content",
    "linkedin": "Generated LinkedIn message"
  }
}
```

### Contact Results

**GET** `/api/contact-results`

Retrieve saved contact research results.

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "company_name": "Company Name",
      "contact_name": "John Doe",
      "contact_email": "john@company.com",
      "confidence_score": 0.85,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Email History

**GET** `/api/history/emails`

Get generated email history.

**Response:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "company_name": "Company Name",
      "subject_line": "Email subject",
      "content": "Email content",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### LinkedIn History

**GET** `/api/history/linkedin`

Get generated LinkedIn message history.

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "company_name": "Company Name",
      "content": "LinkedIn message content",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Message Rephrase

**POST** `/api/rephrase`

Rephrase existing message content.

**Request Body:**
```json
{
  "content": "Original message content",
  "tone": "professional|casual|friendly",
  "type": "email|linkedin"
}
```

**Response:**
```json
{
  "rephrased": "Rephrased message content"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

## Rate Limiting

- **Rate Limit:** 100 requests per hour per user
- **Burst Limit:** 10 requests per minute
- **Headers:**
  - `X-RateLimit-Limit`: Request limit per hour
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time in Unix timestamp

## Webhooks

### Contact Research Complete

Triggered when research pipeline completes.

**Payload:**
```json
{
  "event": "research.completed",
  "data": {
    "company": "Company Name",
    "contact": {...},
    "confidence": 0.85
  }
}
```

## SDKs

### JavaScript/TypeScript

```typescript
import { OutreachAI } from '@outreach-ai/sdk';

const client = new OutreachAI({
  apiKey: 'your-api-key',
  baseURL: 'https://your-domain.vercel.app/api'
});

const research = await client.research({
  company: 'Company Name',
  role: 'Software Engineer'
});
```

### Python

```python
from outreach_ai import OutreachAI

client = OutreachAI(api_key='your-api-key')

research = client.research(
    company='Company Name',
    role='Software Engineer'
)
```

## Examples

### Basic Company Research

```javascript
const response = await fetch('/api/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    company: 'OpenAI',
    role: 'Machine Learning Engineer',
    highlights: 'PhD in AI, published researcher'
  })
});

const data = await response.json();
console.log(data.research.company_overview);
```

### Search Companies

```javascript
const companies = await fetch(
  `/api/company-autocomplete?query=${encodeURIComponent('tech startup')}`
);
const results = await companies.json();
```

## Changelog

### v1.0.0
- Initial API release
- Company research endpoints
- Contact discovery
- Message generation
- Authentication integration
