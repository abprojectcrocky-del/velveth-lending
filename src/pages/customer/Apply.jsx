import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomerNav from '../../components/CustomerNav'
import { toast } from 'sonner'
import {
  notifyLoanApplicationReceived,
  notifyAdminNewApplication,
} from '../../lib/gmail'

const PURPOSES = ['Business Capital','Personal Use','Education','Medical','Home Improvement','Debt Consolidation','Emergency','Other']
const TERMS    = [3,6,12,18,24]

export default function CustomerApply() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [hasActive, setHasActive]   = useState(false)
  const [checkDone, setCheckDone]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [form, setForm] = useState({ loan_amount: '', loan_term: 12, purpose: '' })
  const [computed, setComputed]     = useState({ monthly: 0, total: 0 })
  const [docFiles, setDocFiles]     = useState({})
  const [previews,  setPreviews]    = useState({}) // object URLs for selfie + gov_id previews
  const [step, setStep]             = useState(1) // 1=details, 2=documents, 3=confirm

  // Create/revoke object URLs safely to avoid memory leaks
  useEffect(() => {
    const urls = {}
    if (docFiles['selfie']) urls['selfie'] = URL.createObjectURL(docFiles['selfie'])
    if (docFiles['gov_id']) urls['gov_id'] = URL.createObjectURL(docFiles['gov_id'])
    setPreviews(urls)
    // Cleanup old URLs when files change
    return () => { Object.values(urls).forEach(u => URL.revokeObjectURL(u)) }
  }, [docFiles['selfie'], docFiles['gov_id']])

  useEffect(() => {
    if (!profile?.id) return
    // Check for active/pending loan
    supabase.from('loan_applications').select('id').eq('customer_id', profile.id)
      .in('status', ['pending','approved','active']).limit(1)
      .then(({ data }) => { setHasActive((data?.length ?? 0) > 0); setCheckDone(true) })
  }, [profile])

  useEffect(() => {
    const a = parseFloat(form.loan_amount) || 0
    const rate = 5.0
    const monthly = a > 0 && form.loan_term > 0 ? Math.round(((a + a * rate / 100) / form.loan_term) * 100) / 100 : 0
    setComputed({ monthly, total: monthly * form.loan_term })
  }, [form.loan_amount, form.loan_term])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.loan_amount || parseFloat(form.loan_amount) < 1000 || parseFloat(form.loan_amount) > 500000) {
      toast.error('Loan amount must be between ₱1,000 and ₱500,000'); return
    }
    if (!form.purpose) { toast.error('Please select a purpose'); return }

    setLoading(true)
    try {
      // Generate APP-ID
      const { count } = await supabase.from('loan_applications').select('*', { count:'exact', head:true })
      const appNum    = (count ?? 0) + 1
      const appId     = 'APP-' + String(appNum).padStart(3,'0')

      const { data: app, error: appErr } = await supabase.from('loan_applications').insert({
        app_id: appId,
        customer_id: profile.id,
        loan_amount: parseFloat(form.loan_amount),
        loan_term: form.loan_term,
        interest_rate: 5.0,
        purpose: form.purpose,
        monthly_payment: computed.monthly,
        total_payable: computed.total,
        status: 'pending'
      }).select().single()

      if (appErr) { toast.error('Application failed. Please try again.'); return }

      // Upload documents to Supabase Storage
      // selfie and gov_id are separate entries — both shown side-by-side on step 2
      for (const [docType, file] of Object.entries(docFiles)) {
        if (!file) continue
        const filePath = `${profile.id}/${app.id}/${docType}-${Date.now()}.${file.name.split('.').pop()}`
        const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file)
        if (!uploadErr) {
          const docNum = Math.floor(Math.random() * 90000) + 10000
          await supabase.from('documents').insert({
            doc_id: `DOC-${docNum}`,
            customer_id: profile.id,
            application_id: app.id,
            doc_type: docType,
            file_name: file.name,
            file_path: filePath,
            status: 'pending'
          })
        }
      }

      // Notify admins — in-app + Gmail
      const { data: admins } = await supabase.from('profiles').select('id,email').eq('role','admin').eq('status','active')
      if (admins?.length) {
        await supabase.from('notifications').insert(admins.map(a => ({
          user_id: a.id,
          title: `📋 New Loan Application — ${appId}`,
          message: `${profile.full_name} submitted a loan application for ₱${Number(form.loan_amount).toLocaleString('en-PH')} (${form.loan_term} months).`,
          type: 'info'
        })))
        // Gmail to every admin
        for (const admin of admins) {
          if (admin.email) {
            notifyAdminNewApplication(admin.email, profile.full_name, appId, parseFloat(form.loan_amount))
          }
        }
      }
      // Notify customer — in-app + Gmail
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: '📋 Loan Application Submitted!',
        message: `Your loan application ${appId} for ₱${Number(form.loan_amount).toLocaleString('en-PH')} has been submitted successfully. We will review it within 24 hours.`,
        type: 'success'
      })
      // Gmail to customer
      if (profile.email) {
        notifyLoanApplicationReceived(profile.email, profile.full_name, appId, parseFloat(form.loan_amount))
      }

      toast.success('Application submitted successfully!')
      navigate('/my-loan')
    } finally { setLoading(false) }
  }

  const fmt = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
  const inputStyle = { width:'100%', padding:'12px 14px', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'14px', color:'#2d1018', background:'white' }

  if (!checkDone) return <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><div className="spinner"/></div>

  return (
    <div style={{ background:'#fff5f6', minHeight:'100vh', paddingBottom:'90px', fontFamily:'Inter, Arial, sans-serif' }}>
      <header style={{ background:'var(--primary)', padding:'20px 16px' }}>
        <h1 style={{ color:'white', fontSize:'18px', fontWeight:700 }}>Apply for a Loan</h1>
        <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'12px', marginTop:'2px' }}>Fill out the form below</p>
      </header>

      <div style={{ padding:'16px' }}>
        {hasActive ? (
          <div style={{ background:'white', borderRadius:'12px', padding:'30px 20px', textAlign:'center', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>⚠️</div>
            <h3 style={{ fontSize:'16px', marginBottom:'8px', color:'#333' }}>Existing Application Found</h3>
            <p style={{ fontSize:'13px', color:'#888', marginBottom:'16px', lineHeight:1.6 }}>
              You have an active or pending loan application. Please wait for it to be processed before applying again.
            </p>
            <a href="/my-loan" className="btn btn-primary">View My Loan</a>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
              {['Loan Details','Documents','Confirm'].map((label, i) => (
                <div key={label} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: step > i+1 ? '#16a34a' : step === i+1 ? 'var(--primary)' : '#e0e0e0', color: step >= i+1 ? 'white' : '#888', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, margin:'0 auto 4px' }}>
                    {step > i+1 ? '✓' : i+1}
                  </div>
                  <div style={{ fontSize:'10px', color: step === i+1 ? 'var(--primary)' : '#888', fontWeight: step === i+1 ? 700 : 400 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* STEP 1: Loan Details */}
            {step === 1 && (
              <div style={{ background:'white', borderRadius:'12px', padding:'20px', boxShadow:'var(--shadow-sm)' }}>
                <div style={{ marginBottom:'16px' }}>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'6px', textTransform:'uppercase' }}>Loan Amount (₱)</label>
                  <input type="number" value={form.loan_amount} onChange={e=>set('loan_amount',e.target.value)} style={inputStyle} placeholder="e.g. 50000" min="1000" max="500000" />
                  <p style={{ fontSize:'11px', color:'#888', marginTop:'4px' }}>Minimum: ₱1,000 — Maximum: ₱500,000</p>
                </div>

                <div style={{ marginBottom:'16px' }}>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'8px', textTransform:'uppercase' }}>Loan Term</label>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    {TERMS.map(t => (
                      <button key={t} onClick={()=>set('loan_term',t)} style={{
                        padding:'10px 16px', borderRadius:'8px', border:`2px solid ${form.loan_term===t?'var(--primary)':'#e0e0e0'}`,
                        background: form.loan_term===t?'var(--primary-pale)':'white',
                        color: form.loan_term===t?'var(--primary)':'#666',
                        fontSize:'13px', fontWeight:600, cursor:'pointer'
                      }}>{t} months</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:'16px' }}>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'6px', textTransform:'uppercase' }}>Purpose</label>
                  <select value={form.purpose} onChange={e=>set('purpose',e.target.value)} style={{ ...inputStyle, appearance:'none' }}>
                    <option value="">Select purpose…</option>
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Computed */}
                {computed.monthly > 0 && (
                  <div style={{ background:'var(--primary-pale)', borderRadius:'10px', padding:'16px', marginBottom:'16px', border:'1px solid var(--primary-muted)' }}>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'var(--primary)', marginBottom:'10px' }}>Loan Summary</div>
                    {[
                      ['Interest Rate', '5.0% per month'],
                      ['Monthly Payment', fmt(computed.monthly)],
                      ['Total Payable', fmt(computed.total)],
                      ['Loan Term', `${form.loan_term} months`],
                    ].map(([l,v]) => (
                      <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:'13px' }}>
                        <span style={{ color:'#888' }}>{l}</span>
                        <span style={{ fontWeight:600, color:'#333' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setStep(2)} disabled={!form.loan_amount || !form.purpose} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:'14px' }}>
                  Next: Upload Documents →
                </button>
              </div>
            )}

            {/* STEP 2: Documents */}
            {step === 2 && (
              <div style={{ background:'white', borderRadius:'12px', padding:'20px', boxShadow:'var(--shadow-sm)' }}>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'16px', lineHeight:1.6, background:'#fff8f8', border:'1px solid var(--primary-muted)', borderRadius:'8px', padding:'12px' }}>
                  📋 Please upload clear photos or scans. Accepted: JPG, PNG (max 10MB each).
                </p>

                {/* ── Selfie + ID side by side ── */}
                <div style={{ marginBottom:'18px' }}>
                  <label style={{ display:'block', fontSize:'12px', fontWeight:700, color:'var(--primary)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    Selfie with ID Photo <span style={{ color:'#dc2626', fontWeight:400, textTransform:'none', fontSize:'11px' }}>(Required)</span>
                  </label>
                  <p style={{ fontSize:'11px', color:'#888', marginBottom:'10px', lineHeight:1.6 }}>
                    Take one photo holding your ID beside your face — OR upload separately below (your selfie on the left, your ID on the right).
                  </p>

                  {/* Side-by-side preview boxes */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'6px' }}>
                    {/* LEFT — Selfie */}
                    <div>
                      <div style={{ fontSize:'11px', fontWeight:600, color:'#555', marginBottom:'6px', textAlign:'center' }}>
                        📸 Your Selfie (Left)
                      </div>
                      <label style={{ cursor:'pointer', display:'block' }}>
                        <div style={{
                          border: docFiles['selfie'] ? '2px solid #16a34a' : '2px dashed var(--primary)',
                          borderRadius:'10px', background: docFiles['selfie'] ? '#f0fdf4' : '#fff5f6',
                          aspectRatio:'3/4', display:'flex', flexDirection:'column',
                          alignItems:'center', justifyContent:'center', overflow:'hidden',
                          position:'relative', transition:'all 0.2s'
                        }}>
                          {docFiles['selfie'] ? (
                            <>
                              <img
                                src={previews['selfie']}
                                alt="Selfie preview"
                                style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'8px' }}
                              />
                              <div style={{ position:'absolute', bottom:'6px', left:'50%', transform:'translateX(-50%)', background:'rgba(22,163,74,0.9)', color:'white', fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'100px', whiteSpace:'nowrap' }}>
                                ✓ Uploaded
                              </div>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize:'32px', marginBottom:'6px' }}>🤳</span>
                              <span style={{ fontSize:'11px', color:'#be5a6a', fontWeight:600, textAlign:'center', padding:'0 8px' }}>Tap to upload selfie</span>
                              <span style={{ fontSize:'10px', color:'#aaa', marginTop:'4px' }}>JPG or PNG</span>
                            </>
                          )}
                        </div>
                        <input type="file" accept=".jpg,.jpeg,.png" style={{ display:'none' }}
                          onChange={e => {
                            const file = e.target.files[0]
                            if (file) setDocFiles(f => ({ ...f, selfie: file }))
                          }} />
                      </label>
                      {docFiles['selfie'] && (
                        <button onClick={() => setDocFiles(f => ({ ...f, selfie: null }))}
                          style={{ width:'100%', marginTop:'5px', background:'none', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:'6px', padding:'4px', fontSize:'11px', cursor:'pointer' }}>
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    {/* RIGHT — ID photo */}
                    <div>
                      <div style={{ fontSize:'11px', fontWeight:600, color:'#555', marginBottom:'6px', textAlign:'center' }}>
                        🪪 Your ID (Right)
                      </div>
                      <label style={{ cursor:'pointer', display:'block' }}>
                        <div style={{
                          border: docFiles['gov_id'] ? '2px solid #16a34a' : '2px dashed var(--primary)',
                          borderRadius:'10px', background: docFiles['gov_id'] ? '#f0fdf4' : '#fff5f6',
                          aspectRatio:'3/4', display:'flex', flexDirection:'column',
                          alignItems:'center', justifyContent:'center', overflow:'hidden',
                          position:'relative', transition:'all 0.2s'
                        }}>
                          {docFiles['gov_id'] ? (
                            <>
                              <img
                                src={previews['gov_id']}
                                alt="ID preview"
                                style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'8px' }}
                              />
                              <div style={{ position:'absolute', bottom:'6px', left:'50%', transform:'translateX(-50%)', background:'rgba(22,163,74,0.9)', color:'white', fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'100px', whiteSpace:'nowrap' }}>
                                ✓ Uploaded
                              </div>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize:'32px', marginBottom:'6px' }}>🪪</span>
                              <span style={{ fontSize:'11px', color:'#be5a6a', fontWeight:600, textAlign:'center', padding:'0 8px' }}>Tap to upload ID</span>
                              <span style={{ fontSize:'10px', color:'#aaa', marginTop:'4px' }}>JPG or PNG</span>
                            </>
                          )}
                        </div>
                        <input type="file" accept=".jpg,.jpeg,.png" style={{ display:'none' }}
                          onChange={e => {
                            const file = e.target.files[0]
                            if (file) setDocFiles(f => ({ ...f, gov_id: file }))
                          }} />
                      </label>
                      {docFiles['gov_id'] && (
                        <button onClick={() => setDocFiles(f => ({ ...f, gov_id: null }))}
                          style={{ width:'100%', marginTop:'5px', background:'none', border:'1px solid #fca5a5', color:'#dc2626', borderRadius:'6px', padding:'4px', fontSize:'11px', cursor:'pointer' }}>
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tip box */}
                  <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'8px', padding:'10px 12px', fontSize:'11px', color:'#92400e', lineHeight:1.7 }}>
                    💡 <strong>Tip:</strong> Hold your ID card next to your face and take a single photo — this is the fastest way. Or upload them separately above. Make sure both your face and ID text are clearly visible.
                  </div>
                </div>

                {/* ── Other documents (unchanged) ── */}
                {[
                  ['proof_income',  'Proof of Income *',       'Required'],
                  ['proof_billing', 'Proof of Billing',        'Optional'],
                  ['extra_1',       'Supporting Document 1',   'Optional'],
                  ['extra_2',       'Supporting Document 2',   'Optional'],
                ].map(([key, label, note]) => (
                  <div key={key} style={{ marginBottom:'14px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'6px', textTransform:'uppercase' }}>
                      {label} <span style={{ color: note==='Required'?'#dc2626':'#888', fontWeight:400, textTransform:'none', fontSize:'11px' }}>({note})</span>
                    </label>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => setDocFiles(f => ({ ...f, [key]: e.target.files[0] }))}
                      style={{ width:'100%', padding:'10px', border:'1.5px dashed #e0e0e0', borderRadius:'8px', fontSize:'12px', background:'#fafafa', cursor:'pointer' }} />
                    {docFiles[key] && <div style={{ fontSize:'11px', color:'#16a34a', marginTop:'4px' }}>✓ {docFiles[key].name}</div>}
                  </div>
                ))}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'8px' }}>
                  <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ justifyContent:'center' }}>← Back</button>
                  <button onClick={() => setStep(3)} className="btn btn-primary" style={{ justifyContent:'center' }}>
                    Review & Confirm →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Confirm */}
            {step === 3 && (
              <div style={{ background:'white', borderRadius:'12px', padding:'20px', boxShadow:'var(--shadow-sm)' }}>
                <h3 style={{ fontSize:'16px', fontWeight:700, marginBottom:'16px' }}>Review Your Application</h3>
                {[
                  ['Loan Amount', fmt(parseFloat(form.loan_amount))],
                  ['Loan Term', `${form.loan_term} months`],
                  ['Interest Rate', '5.0% per month'],
                  ['Purpose', form.purpose],
                  ['Monthly Payment', fmt(computed.monthly)],
                  ['Total Payable', fmt(computed.total)],
                  ['Selfie Photo',     docFiles['selfie'] ? '✓ Uploaded' : '✗ Not uploaded'],
                  ['ID Photo',         docFiles['gov_id'] ? '✓ Uploaded' : '✗ Not uploaded'],
                  ['Documents Uploaded', `${Object.values(docFiles).filter(Boolean).length} files total`],
                ].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f5f0f1' }}>
                    <span style={{ fontSize:'13px', color:'#888' }}>{l}</span>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#333' }}>{v}</span>
                  </div>
                ))}
                <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'8px', padding:'12px', margin:'16px 0', fontSize:'12px', color:'#92400e', lineHeight:1.6 }}>
                  ⚠️ By submitting, you confirm all information is accurate and agree to the loan terms.
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <button onClick={() => setStep(2)} className="btn btn-secondary" style={{ justifyContent:'center' }}>← Back</button>
                  <button onClick={handleSubmit} disabled={loading} className="btn btn-primary" style={{ justifyContent:'center', padding:'13px', fontSize:'14px', fontWeight:700 }}>
                    {loading ? 'Submitting…' : '✓ Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <CustomerNav />
    </div>
  )
}
