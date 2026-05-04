// src/app/api/ai/route.ts
// AI-powered clinical suggestion endpoint
// Calls Anthropic Claude API with patient context
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { notes, patientId, visitId } = await request.json()
  if (!notes?.trim()) {
    return NextResponse.json({ error: 'Clinical notes are required' }, { status: 400 })
  }

  // Fetch patient context for the AI
  const { data: patient } = await supabase
    .from('patients')
    .select(`
      full_name, date_of_birth, sex, allergies, medical_history, patient_type,
      clinical_visits(
        diagnosis_description, diagnosis_icd10, created_at,
        treatment_items(procedure_name)
      )
    `)
    .eq('id', patientId)
    .single()

  // Build context for Claude
  const patientContext = patient ? `
Patient: ${patient.full_name}
Type: ${patient.patient_type}
Allergies: ${patient.allergies || 'NKDA'}
Medical History: ${patient.medical_history || 'None reported'}
Past Diagnoses: ${
  patient.clinical_visits?.slice(0, 5).map((v: { diagnosis_description?: string }) =>
    v.diagnosis_description
  ).filter(Boolean).join(', ') || 'First visit'
}
` : ''

  const prompt = `You are an AI clinical assistant embedded in an EMR system for dental and veterinary clinics in the Philippines.

${patientContext}

Clinical notes from the doctor:
"${notes}"

Based on these notes, provide a structured clinical assessment. Respond ONLY with valid JSON in this exact format:
{
  "soap_subjective": "...",
  "soap_objective": "...",
  "soap_assessment": "...",
  "soap_plan": "...",
  "suggested_diagnosis": "...",
  "suggested_icd10": "...",
  "medication_alerts": "...",
  "confidence_score": 0.0,
  "differential_diagnoses": ["...", "..."],
  "suggested_treatments": ["...", "..."]
}

Rules:
- soap_subjective: Patient's complaint in their own words
- soap_objective: Clinical findings only
- soap_assessment: Primary diagnosis with ICD-10 code
- soap_plan: Numbered treatment steps
- suggested_icd10: Most likely ICD-10 code
- medication_alerts: Flag any drug interactions given allergies, or "None"
- confidence_score: 0.0 to 1.0 based on symptom clarity
- Keep all values concise and clinically appropriate
- Do not include any text outside the JSON object`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const claudeData = await response.json()
    const rawText = claudeData.content?.[0]?.text || '{}'
    const suggestion = JSON.parse(rawText)

    // Store suggestion in database
    const { data: stored } = await supabase
      .from('ai_suggestions')
      .insert({
        clinic_id: (await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()).data?.clinic_id,
        patient_id: patientId,
        visit_id: visitId || null,
        raw_input: notes,
        soap_subjective: suggestion.soap_subjective,
        soap_objective: suggestion.soap_objective,
        soap_assessment: suggestion.soap_assessment,
        soap_plan: suggestion.soap_plan,
        suggested_diagnosis: suggestion.suggested_diagnosis,
        suggested_icd10: suggestion.suggested_icd10,
        medication_alerts: suggestion.medication_alerts,
        confidence_score: suggestion.confidence_score,
        accepted: false,
      })
      .select()
      .single()

    return NextResponse.json({
      id: stored?.id,
      ...suggestion,
    })
  } catch (err) {
    console.error('AI suggestion error:', err)
    return NextResponse.json(
      { error: 'AI service temporarily unavailable' },
      { status: 503 }
    )
  }
}
