'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { interpolateWaypoints, type ChargingStation } from '@/lib/tripUtils'
export type { ChargingStation } from '@/lib/tripUtils'
import { connectDB } from '@/lib/db'
import { User, EvData, HealthData, Trip } from '@/lib/models'
import { getUser, setUserSession, clearUserSession } from '@/lib/auth'

async function fileToBase64(file: any): Promise<string | null> {
  if (!file || typeof file === 'string' || !file.name || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    return null;
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return `data:${file.type};base64,${buffer.toString('base64')}`;
  } catch (e) {
    console.error("Conversion failed", e);
    return null;
  }
}

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Please fill all fields' }

  await connectDB()
  const user = await User.findOne({ email }).lean() as any

  if (!user) return { error: 'User not found' }

  const match = await bcrypt.compare(password, user.password)
  if (!match) return { error: 'Invalid password' }

  // Block login if account not yet approved by admin
  if (!user.isApproved && !user.isAdmin) {
    // Catch-22 fix: If there are ZERO admins currently in the database, 
    // automatically elevate this user to Admin and approve them.
    const adminCount = await User.countDocuments({ isAdmin: true })
    if (adminCount === 0) {
      user.isAdmin = true
      user.isApproved = true
      await User.findByIdAndUpdate(user._id, { isAdmin: true, isApproved: true })
    } else {
      return {
        error: '⏳ Your account is pending approval. You will receive an email once approved by the OptiRange team.',
        pending: true,
      }
    }
  }

  await setUserSession(user._id.toString())

  // Check if user has EV data
  const evData = await EvData.findOne({ userId: user._id }).lean()
  if (!evData) redirect('/ev-setup')

  const healthData = await HealthData.findOne({ userId: user._id }).lean()
  if (!healthData) redirect('/health-setup')

  redirect('/dashboard')
}

export async function registerAction(prevState: any, formData: FormData) {
  const firstName = (formData.get('firstName') as string || '').trim()
  const lastName  = (formData.get('lastName')  as string || '').trim()
  const name      = `${firstName} ${lastName}`.trim() || firstName
  const email     = formData.get('email')    as string
  const password  = formData.get('password') as string
  const confirm   = formData.get('confirm')  as string
  // Health fields collected at registration
  const regAge              = parseInt(formData.get('regAge')              as string || '0') || 0
  const regHealthCondition  = (formData.get('regHealthCondition')          as string) || 'none'
  const regRestInterval     = parseInt(formData.get('regRestInterval')     as string || '120') || 120
  // Car fields
  const regCarMake          = (formData.get('regCarMake')         as string || '').trim()
  const regCarModel         = (formData.get('regCarModel')        as string || '').trim()
  const regBatteryCapacity  = parseFloat(formData.get('regBatteryCapacity') as string || '0') || 0
  const regRangeAtFull      = parseInt(formData.get('regRangeAtFull')      as string || '0') || 0

  if (!firstName || !email || !password) return { error: 'Please fill all fields' }
  if (password !== confirm) return { error: 'Passwords do not match' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters' }

  await connectDB()

  // Handle concurrent registrations — check for existing with same email
  const existingUser = await User.findOne({ email }).lean()
  if (existingUser) return { error: 'Email already registered' }

  const profilePicFile = formData.get('profilePic') as File | null
  const profilePicUrl  = await fileToBase64(profilePicFile)
  const hash           = await bcrypt.hash(password, 10)

  const newUser = await User.create({
    name, firstName, lastName, email,
    password: hash,
    profilePic: profilePicUrl,
    isApproved: false,
    regAge, regHealthCondition, regRestInterval,
    regCarMake, regCarModel, regBatteryCapacity, regRangeAtFull,
  })

  // Send admin notification email — fire-and-forget so concurrent registrations don't block each other
  // Each registration sends its own independent email with full health details
  ;(async () => {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const adminEmail = process.env.ADMIN_EMAIL || 'nainil0512@gmail.com'
      const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin?tab=pending`
      const registeredAt = new Date().toLocaleString('en-CA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
      })

      // Health condition display labels
      const healthLabels: Record<string, string> = {
        none:            '✅ None — Generally healthy',
        back_pain:       '🔴 Back Pain / Spine Issues',
        pregnancy:       '🤰 Pregnancy',
        diabetes:        '💉 Diabetes',
        bladder:         '🚻 Frequent Bathroom Needs',
        chronic_fatigue: '😴 Chronic Fatigue',
        other:           '⚠️ Other condition',
      }
      const healthLabel   = healthLabels[regHealthCondition] || regHealthCondition
      const healthRisk    = ['back_pain','pregnancy','bladder','chronic_fatigue','diabetes'].includes(regHealthCondition)
        ? '⚠️ Requires adjusted rest stops'
        : '✅ Standard rest intervals'

    await resend.emails.send({
      from:    process.env.RESEND_FROM || 'OptiRange <onboarding@resend.dev>',
      to:      adminEmail,
      subject: `🆕 New Registration — ${name} is waiting for your approval`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>New User Registration — OptiRange</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:48px 24px 32px;">

    <!-- Header brand bar -->
    <div style="text-align:center;margin-bottom:36px;">
      <div style="display:inline-flex;align-items:center;gap:10px;background:#1e293b;border:1px solid #334155;padding:14px 28px;border-radius:20px;">
        <span style="font-size:24px;">⚡</span>
        <span style="color:#f1f5f9;font-size:22px;font-weight:900;letter-spacing:-0.5px;">OptiRange</span>
        <span style="background:#3b82f6;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;letter-spacing:0.5px;text-transform:uppercase;margin-left:4px;">Admin</span>
      </div>
    </div>

    <!-- Alert banner -->
    <div style="background:linear-gradient(135deg,#3b82f615,#6366f115);border:1px solid #3b82f630;border-radius:20px;padding:28px;text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">🔔</div>
      <h1 style="color:#f1f5f9;margin:0 0 8px;font-size:22px;font-weight:800;">New Registration Request</h1>
      <p style="color:#94a3b8;margin:0;font-size:15px;">A new user is waiting for your approval to access OptiRange</p>
    </div>

    <!-- User details card -->
    <div style="background:#1e293b;border-radius:20px;padding:32px;border:1px solid #334155;margin-bottom:24px;">

      <!-- User avatar + name -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #334155;">
        <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;flex-shrink:0;">
          ${name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p style="color:#f1f5f9;font-size:18px;font-weight:700;margin:0 0 4px;">${name}</p>
          <p style="color:#64748b;font-size:14px;margin:0;">New Member · Pending Approval</p>
        </div>
      </div>

      <!-- Details grid -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;width:40%;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Full Name</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#f1f5f9;font-size:14px;font-weight:600;">${name}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email Address</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <a href="mailto:${email}" style="color:#3b82f6;font-size:14px;font-weight:600;text-decoration:none;">${email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Registered At</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#f1f5f9;font-size:14px;">${registeredAt}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Status</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="background:#f59e0b20;color:#f59e0b;border:1px solid #f59e0b40;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">⏳ Pending Approval</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Health Information card -->
    <div style="background:#1e293b;border-radius:20px;padding:28px;border:1px solid #334155;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <span style="font-size:20px;">❤️</span>
        <div>
          <p style="color:#f1f5f9;font-size:16px;font-weight:700;margin:0;">Health Profile</p>
          <p style="color:#64748b;font-size:12px;margin:0;">Provided by user during registration</p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;width:45%;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Age</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#f1f5f9;font-size:14px;font-weight:600;">${regAge > 0 ? regAge + ' years old' : 'Not provided'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Health Condition</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#f1f5f9;font-size:14px;font-weight:600;">${healthLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Rest Interval</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#f1f5f9;font-size:14px;font-weight:600;">Every ${regRestInterval} minutes</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Trip Impact</span>
          </td>
          <td style="padding:10px 0;">
            <span style="font-size:13px;font-weight:600;${healthRisk.startsWith('⚠️') ? 'color:#f59e0b;' : 'color:#10b981;'}">${healthRisk}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Action buttons -->
    <div style="background:#1e293b;border-radius:20px;padding:28px;border:1px solid #334155;margin-bottom:24px;text-align:center;">
      <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;line-height:1.6;">
        Review this registration and take action from the OptiRange Admin Portal.
        The user is currently unable to log in until you approve their account.
      </p>

      <!-- Approve button -->
      <a href="${approveUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:16px 40px;border-radius:14px;text-decoration:none;font-size:16px;font-weight:800;letter-spacing:-0.3px;margin-bottom:12px;">
        ✅ &nbsp;Approve ${name.split(' ')[0]}'s Account
      </a>

      <br/>

      <a href="${approveUrl}"
        style="display:inline-block;color:#64748b;font-size:13px;text-decoration:none;margin-top:8px;">
        Or open Admin Portal to review all pending registrations →
      </a>
    </div>

    <!-- Info strip -->
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:20px;margin-bottom:24px;">
      <p style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px;">What happens next?</p>
      <p style="color:#64748b;font-size:13px;margin:4px 0;">✅ <strong style="color:#94a3b8;">Approve</strong> — User receives a congratulations email and can log in immediately</p>
      <p style="color:#64748b;font-size:13px;margin:4px 0;">❌ <strong style="color:#94a3b8;">Reject</strong> — User receives a rejection notice and their account is removed</p>
    </div>

    <!-- Car Details card -->
    <div style="background:#1e293b;border-radius:20px;padding:28px;border:1px solid #334155;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <span style="font-size:20px;">🚗</span>
        <div>
          <p style="color:#f1f5f9;font-size:16px;font-weight:700;margin:0;">Vehicle Details</p>
          <p style="color:#64748b;font-size:12px;margin:0;">EV registered during sign-up</p>
        </div>
      </div>

      ${regCarMake ? `
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;width:45%;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Make / Brand</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#f1f5f9;font-size:14px;font-weight:600;">${regCarMake}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Model</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#f1f5f9;font-size:14px;font-weight:600;">${regCarModel || '—'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Battery Capacity</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #1e3a5f;">
            <span style="color:#3b82f6;font-size:14px;font-weight:700;">${regBatteryCapacity > 0 ? regBatteryCapacity + ' kWh' : '—'}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <span style="color:#475569;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Range at Full</span>
          </td>
          <td style="padding:10px 0;">
            <span style="color:#10b981;font-size:14px;font-weight:700;">${regRangeAtFull > 0 ? regRangeAtFull + ' km' : '—'}</span>
          </td>
        </tr>
      </table>
      ` : `
      <p style="color:#475569;font-size:14px;font-style:italic;margin:0;">No vehicle details provided during registration.</p>
      `}
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#334155;font-size:12px;line-height:1.8;">
      <p style="margin:0 0 4px;">This is an automated notification from <strong style="color:#475569;">OptiRange AI</strong></p>
      <p style="margin:0 0 4px;">Sent to admin at <a href="mailto:${adminEmail}" style="color:#3b82f6;text-decoration:none;">${adminEmail}</a></p>
      <p style="margin:8px 0 0;">
        <a href="${approveUrl}" style="color:#3b82f6;text-decoration:none;">Admin Portal</a>
        &nbsp;·&nbsp;
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color:#3b82f6;text-decoration:none;">OptiRange Home</a>
      </p>
    </div>

  </div>
</body>
</html>`,
    })
    } catch (err) {
      console.error('[Register] Admin notification email failed:', err)
    }
  })() // fire-and-forget — does not block the registration response

  // Return pending state — DO NOT set session or redirect yet
  return {
    pending: true,
    message: `✅ Registration successful! Your account is pending approval. You'll receive an email at ${email} once approved.`,
  }
}

export async function logoutAction() {
  await clearUserSession()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function getUserProfileAction() {
  const user = await getUser()
  if (!user) return null
  await connectDB()
  const full = await User.findById(user.id).select('firstName lastName name email profilePic').lean() as any
  if (!full) return null
  let firstName = full.firstName || ''
  let lastName  = full.lastName  || ''
  if (!firstName && !lastName && full.name) {
    const parts = full.name.trim().split(' ')
    firstName = parts[0] || ''
    lastName  = parts.slice(1).join(' ') || ''
  }
  return { firstName, lastName, email: full.email ?? '', profilePic: full.profilePic ?? null }
}

export async function updateProfileAction(prevState: any, formData: FormData) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }
  const firstName = formData.get('firstName') as string
  const lastName  = formData.get('lastName') as string
  const email     = formData.get('email') as string
  const password  = formData.get('password') as string | null
  const confirm   = formData.get('confirm') as string | null
  if (!firstName || !lastName || !email) return { error: 'Name and email are required' }
  await connectDB()
  if (email !== user.email) {
    const dup = await User.findOne({ email, _id: { $ne: user.id } }).lean()
    if (dup) return { error: 'Email is already in use by another account' }
  }
  const updateData: Record<string, any> = { firstName, lastName, email, name: `${firstName} ${lastName}`.trim() }
  const profilePicFile = formData.get('profilePic') as File | null
  const MAX_SIZE = 2 * 1024 * 1024
  if (profilePicFile && typeof profilePicFile !== 'string' && profilePicFile.size > MAX_SIZE) {
    return { error: 'Profile picture must be under 2 MB' }
  }
  const profilePicUrl = await fileToBase64(profilePicFile)
  if (profilePicUrl) updateData.profilePic = profilePicUrl
  if (password && password.trim().length > 0) {
    if (password !== confirm) return { error: 'New passwords do not match' }
    if (password.length < 6) return { error: 'Password must be at least 6 characters' }
    updateData.password = await bcrypt.hash(password, 10)
  }
  await User.findByIdAndUpdate(user.id, { $set: updateData }, { new: true, runValidators: true })
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  revalidatePath('/', 'layout')
  return { success: true, message: 'Profile updated successfully' }
}

export async function saveEvData(prevState: any, formData: FormData) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  const make             = formData.get('make') as string
  const model            = formData.get('model') as string
  const nickname         = (formData.get('nickname') as string) || ''
  const batteryCapacity  = Number(formData.get('batteryCapacity'))
  const rangeAtFull      = Number(formData.get('rangeAtFull'))
  const editId           = formData.get('editId') as string | null
  const currentCharge    = batteryCapacity

  if (!make || !model || !batteryCapacity || !rangeAtFull) {
    return { error: 'Please fill all fields properly' }
  }

  await connectDB()

  const carPicFile = formData.get('carPic') as File | null
  let carPicUrl = await fileToBase64(carPicFile)

  if (editId) {
    // Editing an existing car
    const existing = await EvData.findOne({ _id: editId, userId: user.id })
    if (!existing) return { error: 'Car not found' }
    if (!carPicUrl && existing.carPic) carPicUrl = existing.carPic
    await EvData.updateOne(
      { _id: editId },
      { make, model, nickname, batteryCapacity, currentCharge, rangeAtFull, carPic: carPicUrl }
    )
  } else {
    // Always create a new car entry — supports multi-car garage
    await EvData.create({
      userId: user.id, make, model, nickname, batteryCapacity, currentCharge, rangeAtFull, carPic: carPicUrl
    })
  }

  revalidatePath('/dashboard')
  revalidatePath('/trip-planner')

  // Only redirect to health-setup if this is the very first car
  const carCount = await EvData.countDocuments({ userId: user.id })
  const hasHealth = await (await import('@/lib/models')).HealthData.findOne({ userId: user.id })
  if (carCount === 1 && !hasHealth) redirect('/health-setup')
  redirect('/dashboard')
}

export async function deleteEvAction(evId: string) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  await connectDB()

  // Safety: ensure at least one car remains after delete
  const count = await EvData.countDocuments({ userId: user.id })
  if (count <= 1) return { error: 'You must keep at least one vehicle' }

  await EvData.deleteOne({ _id: evId, userId: user.id })

  revalidatePath('/dashboard')
  revalidatePath('/trip-planner')
  return { success: true }
}

export async function saveTripData(
  startLocation: string,
  endLocation: string,
  distance: number,
  estimatedTime: string,
  batteryUsed: number,
  chargingStops: number
) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  await connectDB()
  
  const result = await Trip.create({
    userId: user.id, startLocation, endLocation, distance, estimatedTime, batteryUsed, chargingStops
  })

  revalidatePath('/dashboard')
  revalidatePath('/trip-planner')
  return { success: true, tripId: result._id.toString() }
}

export async function deleteTripAction(tripId: string) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  await connectDB()
  await Trip.deleteOne({ _id: tripId, userId: user.id })
  
  revalidatePath('/dashboard')
  revalidatePath('/trip-planner')
}

export async function saveHealthData(prevState: any, formData: FormData) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }

  const age = Number(formData.get('age'))
  const healthCondition = formData.get('healthCondition') as string
  const preferredRestInterval = Number(formData.get('preferredRestInterval'))

  if (!age || !healthCondition || !preferredRestInterval) {
    return { error: 'Please fill all fields properly' }
  }

  await connectDB()
  const exists = await HealthData.findOne({ userId: user.id })
  
  if (exists) {
    await HealthData.updateOne(
      { userId: user.id },
      { age, healthCondition, preferredRestInterval }
    )
  } else {
    await HealthData.create({
      userId: user.id, age, healthCondition, preferredRestInterval
    })
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

// ── Google Polyline decoder ─────────────────────────────────────────────────
function decodePolyline(encoded: string): Array<{ lat: number; lon: number }> {
  const points: Array<{ lat: number; lon: number }> = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lon: lng / 1e5 });
  }
  return points;
}

// ── Sample N evenly-spaced points from a polyline ──────────────────────────
function samplePolyline(
  points: Array<{ lat: number; lon: number }>,
  numSamples: number
): Array<{ lat: number; lon: number }> {
  if (points.length === 0 || numSamples === 0) return [];
  if (numSamples >= points.length) return points;
  const result: Array<{ lat: number; lon: number }> = [];
  for (let i = 1; i <= numSamples; i++) {
    const idx = Math.round((i / (numSamples + 1)) * (points.length - 1));
    result.push(points[idx]);
  }
  return result;
}

// ========================================================
// ML PREDICTION ENGINE — translated from Python prediction.py
// ========================================================

function calculateRange(battery: number, efficiency: number = 5) {
  return battery * efficiency;
}

function calculateStops(distance: number, rangeKm: number) {
  if (rangeKm === 0) return 0;
  return Math.max(0, Math.ceil(distance / rangeKm) - 1);
}

function healthCheck(fatigue: string, sleep: number) {
  if (sleep < 5) return '⚠️ Low sleep. Take frequent breaks.';
  if (fatigue === 'high') return '🚨 High fatigue. Avoid long driving.';
  return '✅ You are fit to drive.';
}

function predictML(data: { battery: number; distance: number; fatigue: string; sleep: number }) {
  const rangeKm = calculateRange(data.battery);
  const result: any = {};
  if (rangeKm >= data.distance) {
    result.status = 'Reachable'; result.charging_required = false; result.stops = 0;
  } else {
    result.status = 'Charging Needed'; result.charging_required = true;
    result.stops = calculateStops(data.distance, rangeKm);
  }
  result.estimated_range = rangeKm;
  result.health_advice = healthCheck(data.fatigue, data.sleep);
  return result;
}

export async function runMLPredictionDirect(
  batteryCapacityKwh: number,
  distanceMiles: number,
  weatherPenalty: number,
  healthData: { healthCondition?: string; preferredRestInterval?: number } | null
): Promise<{
  status: string; charging_required: boolean; stops: number;
  estimated_range_miles: number; health_advice: string; effective_range_miles: number;
  driverMultiplier?: number;
}> {
  // Driver efficiency: adjusts range based on user's historical trips vs rated specs
  const user = await getUser();
  let driverMultiplier = 1.0;
  if (user) {
    try {
      const { calculateDriverEfficiency } = await import('@/lib/analysis');
      driverMultiplier = await calculateDriverEfficiency(user.id);
    } catch {}
  }

  const baseRangeKm      = calculateRange(batteryCapacityKwh);
  const rangeKm          = baseRangeKm * driverMultiplier;
  const distanceKm       = distanceMiles * 1.60934;
  const effectiveRangeKm = rangeKm * (1 - weatherPenalty);

  const condition = healthData?.healthCondition || 'none';
  const fatigueLookup: Record<string, string> = {
    chronic_fatigue: 'high', back_pain: 'medium',
    pregnancy: 'medium', bladder: 'medium', none: 'low',
  };
  const fatigue = fatigueLookup[condition] || 'low';
  const sleep   = 7;

  const mlResult = predictML({ battery: batteryCapacityKwh, distance: distanceKm, fatigue, sleep });

  return {
    status:                 mlResult.status,
    charging_required:      mlResult.charging_required,
    stops:                  calculateStops(distanceKm, effectiveRangeKm),
    estimated_range_miles:  Math.round((mlResult.estimated_range / 1.60934) * (1 - weatherPenalty)),
    health_advice:          mlResult.health_advice,
    effective_range_miles:  Math.round(effectiveRangeKm / 1.60934),
    driverMultiplier,
  };
}

export async function runMLPredictionAction(
  battery: number, start: string, destination: string,
  sleep: number, fatigue: string
) {
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(start)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_API_KEY}`
    );
    const data = await response.json();
    if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const distanceKm = data.rows[0].elements[0].distance.value / 1000;
      const prediction = predictML({ battery, distance: distanceKm, fatigue, sleep });
      return { success: true, distance: distanceKm, prediction };
    }
    return { error: 'Google API issue or route not found' };
  } catch (err: any) {
    return { error: err.message || 'Prediction failed' };
  }
}

export async function calculateTripData(
  startLat: number, startLon: number,
  destLat: number, destLon: number,
  routePreference: 'toll' | 'free' = 'free'
) {
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

  // ── Primary: Google Maps Directions API — gives real distance + route polyline ──
  if (GOOGLE_API_KEY && !GOOGLE_API_KEY.startsWith('YOUR_')) {
    try {
      // avoid=tolls for free route (Hwy 401), nothing for toll route (ETR 407)
      const avoidParam = routePreference === 'free' ? '&avoid=tolls' : '';
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${startLat},${startLon}` +
        `&destination=${destLat},${destLon}` +
        `&key=${GOOGLE_API_KEY}` +
        avoidParam;

      const res  = await fetch(url);
      const data = await res.json();
      const route = data?.routes?.[0];
      const leg   = route?.legs?.[0];

      if (leg?.distance && leg?.duration) {
        const drivingDistance = Math.round(leg.distance.value / 1609.34); // metres → miles
        const durationMinutes = Math.round(leg.duration.value / 60);

        // Decode the overview polyline to get actual road points
        const encoded  = route.overview_polyline?.points || '';
        const polyline = encoded ? decodePolyline(encoded) : [];

        return { drivingDistance, durationMinutes, source: 'google_maps', polyline };
      }
    } catch (e) {
      console.error('[calculateTripData] Directions API error, falling back to Haversine:', e);
    }
  }

  // ── Fallback: Haversine + driving-distance multiplier ──
  const R = 3958.8;
  const dLat = (destLat - startLat) * (Math.PI / 180);
  const dLon = (destLon - startLon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(startLat * (Math.PI / 180)) *
      Math.cos(destLat * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  const crowFliesDistance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let drivingDistance = Math.round(crowFliesDistance * 1.25);
  if (drivingDistance < 1) drivingDistance = 1;
  const durationMinutes = Math.round((drivingDistance / 55) * 60);
  return { drivingDistance, durationMinutes, source: 'haversine', polyline: [] as Array<{ lat: number; lon: number }> };
}

// ── Public helper: pick N charging-stop search centres from a route polyline ─
// Called from TripPlannerClient — takes the decoded polyline and samples
// evenly-spaced real road points to use as NRCan query centres.

// ── Helper: sample N evenly-spaced real road points from Directions API legs ──
// Called server-side only — avoids sending large polylines to the client
async function sampleRouteWaypoints(
  startLat: number, startLon: number,
  destLat: number,  destLon: number,
  numPoints: number,
  apiKey: string,
  routePreference: 'toll' | 'free' = 'free'
): Promise<Array<{ lat: number; lon: number }>> {
  // Straight-line fallback (used if Directions call fails or no API key)
  const fallback = () => {
    const pts: Array<{ lat: number; lon: number }> = [];
    for (let i = 1; i <= numPoints; i++) {
      const f = i / (numPoints + 1);
      pts.push({
        lat: startLat + (destLat - startLat) * f,
        lon: startLon + (destLon - startLon) * f,
      });
    }
    return pts;
  };

  if (!apiKey || apiKey.startsWith('YOUR_')) return fallback();

  try {
    const avoidParam = routePreference === 'free' ? '&avoid=tolls' : '';
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${startLat},${startLon}` +
      `&destination=${destLat},${destLon}` +
      `&key=${apiKey}` +
      avoidParam;

    const res  = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return fallback();

    // Collect all step end-points from all legs — these are ON actual roads
    const roadPoints: Array<{ lat: number; lon: number }> = [{ lat: startLat, lon: startLon }];
    (route.legs || []).forEach((leg: any) => {
      (leg.steps || []).forEach((step: any) => {
        if (step.end_location) {
          roadPoints.push({ lat: step.end_location.lat, lon: step.end_location.lng });
        }
      });
    });
    roadPoints.push({ lat: destLat, lon: destLon });

    if (roadPoints.length < 2) return fallback();

    // Sample numPoints evenly-spaced from the road points
    const result: Array<{ lat: number; lon: number }> = [];
    for (let i = 1; i <= numPoints; i++) {
      const idx = Math.round((i / (numPoints + 1)) * (roadPoints.length - 1));
      result.push(roadPoints[Math.min(idx, roadPoints.length - 1)]);
    }
    return result;
  } catch {
    return fallback();
  }
}

// ── Keep legacy export so existing imports still compile ───────────────────────
export async function getRouteWaypoints(
  polyline: Array<{ lat: number; lon: number }>,
  startLat: number, startLon: number,
  destLat: number,  destLon: number,
  numStops: number
): Promise<Array<{ lat: number; lon: number }>> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  return sampleRouteWaypoints(startLat, startLon, destLat, destLon, numStops, apiKey);
}

// ── Unified action: fetch real charging stations along the route ───────────────
// Gets its own road-accurate waypoints via Directions API — never interpolates
// straight-line points that may fall in lakes or off-road.
export async function fetchNRCanStationsAction(
  waypoints: Array<{ lat: number; lon: number }>,
  routeStart?: { lat: number; lon: number },
  routeDest?:  { lat: number; lon: number },
  routePreference: 'toll' | 'free' = 'free'
): Promise<ChargingStation[][]> {
  if (waypoints.length === 0) return [];

  const numStops = waypoints.length;

  // ── Haversine distance helper ─────────────────────────────────────────────
  const hKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
      Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // ── Ideal stop positions along the route (straight-line fractions) ─────────
  // Used only for assigning collected stations to stops — NOT for querying
  const idealPositions = Array.from({ length: numStops }, (_, i) => {
    const s = routeStart || waypoints[0];
    const d = routeDest  || waypoints[waypoints.length - 1];
    const f = (i + 1) / (numStops + 1);
    return { lat: s.lat + (d.lat - s.lat) * f, lon: s.lon + (d.lon - s.lon) * f };
  });

  // ── Bounding box of the full route with generous padding ─────────────────
  const s = routeStart || waypoints[0];
  const d = routeDest  || waypoints[waypoints.length - 1];
  const PADDING  = 3.0; // ~330 km — wide enough to catch any highway detours
  const boxMinLat = Math.min(s.lat, d.lat) - PADDING;
  const boxMaxLat = Math.max(s.lat, d.lat) + PADDING;
  const boxMinLon = Math.min(s.lon, d.lon) - PADDING;
  const boxMaxLon = Math.max(s.lon, d.lon) + PADDING;
  const inBox = (lat: number, lon: number) =>
    lat >= boxMinLat && lat <= boxMaxLat && lon >= boxMinLon && lon <= boxMaxLon;

  // ── Strategy: query multiple points along the route, collect all stations ──
  // Sample 5 evenly-spaced points regardless of numStops to cover the corridor
  const NUM_QUERY_PTS = Math.max(numStops * 2, 5);
  const queryPts = Array.from({ length: NUM_QUERY_PTS }, (_, i) => {
    const f = (i + 1) / (NUM_QUERY_PTS + 1);
    return { lat: s.lat + (d.lat - s.lat) * f, lon: s.lon + (d.lon - s.lon) * f };
  });
  // Also add the actual start/dest midpoints as fallback query points
  queryPts.push({ lat: (s.lat + d.lat) / 2, lon: (s.lon + d.lon) / 2 });

  // ── Collect ALL stations from every query point ────────────────────────────
  const allStationsMap = new Map<string, ChargingStation>();

  const nrelKey = process.env.NREL_API_KEY || 'DEMO_KEY';

  await Promise.all(queryPts.map(async (qp) => {
    // NREL query with 150km radius per point to ensure coverage
    try {
      const url =
        `https://developer.nrel.gov/api/alt-fuel-stations/v1.json` +
        `?api_key=${nrelKey}&fuel_type=ELEC` +
        `&latitude=${qp.lat}&longitude=${qp.lon}` +
        `&radius=150&limit=30&status=E`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        (data?.fuel_stations || []).forEach((st: any) => {
          if (!st.latitude || !st.longitude) return;
          if (!inBox(st.latitude, st.longitude)) return;
          const id = `nrel-${st.id}`;
          if (!allStationsMap.has(id)) {
            allStationsMap.set(id, {
              id,
              name:        st.station_name   || 'Charging Station',
              address:     st.street_address || '',
              city:        st.city           || '',
              province:    st.state          || '',
              lat:         st.latitude,
              lon:         st.longitude,
              level2Ports: st.ev_level2_evse_num || 0,
              dcFastPorts: st.ev_dc_fast_num     || 0,
              network:     st.ev_network         || 'Unknown',
            });
          }
        });
      }
    } catch {}

    // NRCan query (Canada stations)
    try {
      const url =
        `${process.env.NRCAN_EVCS_URL || 'https://chargepoints.ped.nrcan.gc.ca/api/crs/fmt/json'}` +
        `?lang=en&lat=${qp.lat}&lng=${qp.lon}&dist=150`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        (data?.fuel_stations || []).forEach((st: any) => {
          if (!st.latitude || !st.longitude) return;
          const lat = parseFloat(st.latitude), lon = parseFloat(st.longitude);
          if (!inBox(lat, lon)) return;
          const id = `nrcan-${st.id || st.hy_objectid}`;
          if (!allStationsMap.has(id)) {
            allStationsMap.set(id, {
              id,
              name:        st.station_name || st.name || 'Charging Station',
              address:     st.street_address || st.address || '',
              city:        st.city      || '',
              province:    st.state     || st.province || '',
              lat, lon,
              level2Ports: parseInt(st.ev_level2_evse_num) || 0,
              dcFastPorts: parseInt(st.ev_dc_fast_num)     || 0,
              network:     st.ev_network || st.owner_type_code || 'Unknown',
            });
          }
        });
      }
    } catch {}
  }));

  const allStations = Array.from(allStationsMap.values());
  console.log(`[Stations] Collected ${allStations.length} unique stations along the corridor`);

  if (allStations.length === 0) {
    // Nothing found at all — return empty arrays
    return Array.from({ length: numStops }, () => []);
  }

  // ── Assign stations to stops greedily by proximity ─────────────────────────
  // For each stop (in order), pick the closest unused station to the ideal position
  const usedIds = new Set<string>();
  const results: ChargingStation[][] = [];

  for (let i = 0; i < numStops; i++) {
    const ideal = idealPositions[i];

    // Sort all available (unused) stations by distance to this stop's ideal position
    const sorted = allStations
      .filter(st => !usedIds.has(st.id))
      .map(st => ({ st, dist: hKm(st.lat, st.lon, ideal.lat, ideal.lon) }))
      .sort((a, b) => {
        // Prefer DCFC over L2, then by distance
        if (b.st.dcFastPorts !== a.st.dcFastPorts) return b.st.dcFastPorts - a.st.dcFastPorts;
        return a.dist - b.dist;
      });

    // Give each stop a geographic window — stations should be within the right
    // third of the route, not way behind or ahead
    const routeLenKm = hKm(s.lat, s.lon, d.lat, d.lon) * 1.3; // rough driving dist
    const windowKm   = routeLenKm / (numStops + 1) * 1.5; // 1.5x segment length

    // Try to find a station within the window first, fall back to nearest overall
    const windowMatches = sorted.filter(x => x.dist <= windowKm);
    const candidates    = (windowMatches.length > 0 ? windowMatches : sorted).slice(0, 3);

    candidates.forEach(c => usedIds.add(c.st.id));
    results.push(candidates.map(c => c.st));
  }

  return results;
}

// interpolateWaypoints moved to @/lib/tripUtils — import from there


// ========================================================
// SAVED LOCATIONS — Home, Work, Favourites
// ========================================================

export async function getSavedLocationsAction() {
  const user = await getUser()
  if (!user) return []
  await connectDB()
  const { SavedLocation } = await import('@/lib/models')
  const locs = await SavedLocation.find({ userId: user.id }).sort({ createdAt: 1 }).lean() as any[]
  return locs.map((l: any) => ({
    id:      l._id.toString(),
    label:   l.label,
    type:    l.type,
    address: l.address,
    lat:     l.lat,
    lon:     l.lon,
  }))
}

export async function saveFavouriteAction(
  label: string,
  type: 'home' | 'work' | 'favourite',
  address: string,
  lat: number,
  lon: number
) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }
  await connectDB()
  const { SavedLocation } = await import('@/lib/models')
  // Home and Work are singletons — upsert; Favourites always create new
  if (type === 'home' || type === 'work') {
    await SavedLocation.findOneAndUpdate(
      { userId: user.id, type },
      { label, address, lat, lon },
      { upsert: true }
    )
  } else {
    await SavedLocation.create({ userId: user.id, label, type, address, lat, lon })
  }
  revalidatePath('/trip-planner')
  return { success: true }
}

export async function deleteFavouriteAction(id: string) {
  const user = await getUser()
  if (!user) return { error: 'Unauthorized' }
  await connectDB()
  const { SavedLocation } = await import('@/lib/models')
  await SavedLocation.deleteOne({ _id: id, userId: user.id })
  revalidatePath('/trip-planner')
  return { success: true }
}

// ========================================================
// RECENT SEARCHES
// ========================================================

export async function saveRecentSearchAction(address: string, lat: number, lon: number) {
  const user = await getUser()
  if (!user) return
  await connectDB()
  const { RecentSearch } = await import('@/lib/models')
  // Remove duplicate if same address already saved
  await RecentSearch.deleteOne({ userId: user.id, address })
  await RecentSearch.create({ userId: user.id, address, lat, lon })
  // Keep only last 8 recent searches per user
  const all = await RecentSearch.find({ userId: user.id }).sort({ usedAt: -1 }).lean()
  if (all.length > 8) {
    const toDelete = all.slice(8).map((r: any) => r._id)
    await RecentSearch.deleteMany({ _id: { $in: toDelete } })
  }
}

export async function getRecentSearchesAction() {
  const user = await getUser()
  if (!user) return []
  await connectDB()
  const { RecentSearch } = await import('@/lib/models')
  const searches = await RecentSearch.find({ userId: user.id }).sort({ usedAt: -1 }).limit(8).lean() as any[]
  return searches.map((s: any) => ({
    address: s.address,
    lat:     s.lat,
    lon:     s.lon,
  }))
}


// ── Get single EV by ID (used by ev-setup edit mode) ─────────────────────────
export async function getEvByIdAction(evId: string) {
  const user = await getUser()
  if (!user) return null
  await connectDB()
  const ev = await EvData.findOne({ _id: evId, userId: user.id }).lean() as any
  if (!ev) return null
  return {
    id:              ev._id.toString(),
    make:            ev.make            || '',
    model:           ev.model           || '',
    nickname:        ev.nickname        || '',
    batteryCapacity: ev.batteryCapacity || 0,
    rangeAtFull:     ev.rangeAtFull     || 0,
    carPic:          ev.carPic          || null,
  }
}


// ── Get current user's health data (used by health-setup edit mode) ───────────
export async function getHealthDataAction() {
  const user = await getUser()
  if (!user) return null
  await connectDB()
  const h = await HealthData.findOne({ userId: user.id }).lean() as any
  if (!h) return null
  return {
    age:                   h.age                   ?? '',
    healthCondition:       h.healthCondition       ?? 'none',
    preferredRestInterval: h.preferredRestInterval ?? 120,
  }
}


// ========================================================
// SERVICE REMINDER SYSTEM
// ========================================================

export async function checkAndSendServiceReminder(
  userId: string,
  evId: string,
  make: string,
  model: string,
  totalKm: number,
  userLat?: number,
  userLon?: number
) {
  const { isDueForService, getNearbyDealerships, buildServiceEmailHtml, getBookingUrl } = await import('@/lib/serviceReminder');
  const { ServiceReminder } = await import('@/lib/models');

  const { due, milestone } = isDueForService(make, totalKm);
  if (!due || !milestone) return { sent: false };

  // Check if we already sent a reminder for this milestone
  await connectDB();
  const existing = await ServiceReminder.findOne({ userId, evId, milestone });
  if (existing) return { sent: false, alreadySent: true };

  // Get user email + name
  const userRecord = await User.findById(userId).select('email firstName name').lean() as any;
  if (!userRecord?.email) return { sent: false };

  const firstName = userRecord.firstName || userRecord.name?.split(' ')[0] || 'Driver';

  // Find nearby dealerships
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  const dealerships = userLat && userLon
    ? await getNearbyDealerships(userLat, userLon, make, apiKey)
    : [];

  const bookingUrl = getBookingUrl(make);

  // Build and send email
  const html = buildServiceEmailHtml({ firstName, make, model, totalKm, milestone, dealerships, bookingUrl });

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    process.env.RESEND_FROM || 'OptiRange <onboarding@resend.dev>',
      to:      userRecord.email,
      subject: `🔧 Service Due — Your ${make} ${model} needs attention`,
      html,
    });
  } catch (err) {
    console.error('[ServiceReminder] Email send failed:', err);
  }

  // Record the reminder
  await ServiceReminder.create({ userId, evId, milestone, emailSent: true, sentAt: new Date() });

  revalidatePath('/dashboard');
  return { sent: true, milestone };
}

export async function getServiceRemindersAction() {
  const user = await getUser();
  if (!user) return [];
  await connectDB();
  const { ServiceReminder } = await import('@/lib/models');
  const reminders = await ServiceReminder.find({ userId: user.id, dismissed: false })
    .sort({ createdAt: -1 }).lean() as any[];
  return reminders.map((r: any) => ({
    id:         r._id.toString(),
    evId:       r.evId.toString(),
    milestone:  r.milestone,
    emailSent:  r.emailSent,
    sentAt:     r.sentAt?.toISOString?.() ?? null,
    dismissed:  r.dismissed,
  }));
}

export async function dismissServiceReminderAction(reminderId: string) {
  const user = await getUser();
  if (!user) return;
  await connectDB();
  const { ServiceReminder } = await import('@/lib/models');
  await ServiceReminder.updateOne(
    { _id: reminderId, userId: user.id },
    { dismissed: true, dismissedAt: new Date() }
  );
  revalidatePath('/dashboard');
}

// ── Hook into saveTripData to auto-check service ─────────────────────────────
// Updated version of saveTripData that also triggers service check
export async function saveTripWithServiceCheck(
  startLocation: string,
  endLocation: string,
  distance: number,
  estimatedTime: string,
  batteryUsed: number,
  chargingStops: number,
  evId?: string,
  startLat?: number,
  startLon?: number
) {
  const user = await getUser();
  if (!user) return { error: 'Unauthorized' };

  await connectDB();

  const result = await Trip.create({
    userId: user.id, evId: evId || undefined,
    startLocation, endLocation, distance, estimatedTime, batteryUsed, chargingStops,
  });

  // Calculate cumulative mileage for this EV
  const distanceKm = distance * 1.60934;
  const query: any = { userId: user.id };
  if (evId) query.evId = evId;
  const allTrips = await Trip.find(query).lean() as any[];
  const totalKm = allTrips.reduce((acc: number, t: any) => acc + ((t.distance || 0) * 1.60934), 0);

  // Get EV details for service check
  if (evId) {
    const ev = await EvData.findById(evId).lean() as any;
    if (ev) {
      await checkAndSendServiceReminder(
        user.id, evId, ev.make, ev.model, Math.round(totalKm),
        startLat, startLon
      );
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/trip-planner');
  return { success: true, tripId: result._id.toString() };
}


// ========================================================
// ADMIN PORTAL ACTIONS
// ========================================================

async function requireAdmin() {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');
  await connectDB();
  const u = await User.findById(user.id).select('isAdmin').lean() as any;
  if (!u?.isAdmin) throw new Error('Forbidden — admin only');
  return user;
}

export async function getAdminStatsAction() {
  await requireAdmin();
  await connectDB();

  const { ServiceReminder } = await import('@/lib/models');

  const [totalUsers, totalTrips, totalCars, pendingReminders] = await Promise.all([
    User.countDocuments(),
    Trip.countDocuments(),
    EvData.countDocuments(),
    ServiceReminder.countDocuments({ dismissed: false, emailSent: true }),
  ]);

  const totalDistanceResult = await Trip.aggregate([
    { $group: { _id: null, total: { $sum: '$distance' } } },
  ]);
  const totalDistance = totalDistanceResult[0]?.total?.toFixed(0) ?? 0;

  return { totalUsers, totalTrips, totalCars, pendingReminders, totalDistance };
}

export async function getAdminUsersAction() {
  await requireAdmin();
  await connectDB();

  const users = await User.find().select('firstName lastName name email isAdmin createdAt').sort({ createdAt: -1 }).lean() as any[];
  const userIds = users.map((u: any) => u._id);

  const tripCounts = await Trip.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const carCounts = await EvData.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);

  const tripMap = Object.fromEntries(tripCounts.map((t: any) => [t._id.toString(), t.count]));
  const carMap  = Object.fromEntries(carCounts.map((c: any)  => [c._id.toString(), c.count]));

  return users.map((u: any) => ({
    id:        u._id.toString(),
    name:      u.firstName ? `${u.firstName} ${u.lastName}`.trim() : (u.name || ''),
    email:     u.email,
    isAdmin:   u.isAdmin || false,
    joinedAt:  u.createdAt?.toISOString?.() ?? '',
    tripCount: tripMap[u._id.toString()] || 0,
    carCount:  carMap[u._id.toString()]  || 0,
  }));
}

export async function getAdminFleetAction() {
  await requireAdmin();
  await connectDB();

  const cars = await EvData.find().select('make model batteryCapacity rangeAtFull createdAt').lean() as any[];

  // Group by make for chart
  const makeCount: Record<string, number> = {};
  cars.forEach((c: any) => {
    const key = c.make || 'Unknown';
    makeCount[key] = (makeCount[key] || 0) + 1;
  });

  return {
    total: cars.length,
    byMake: Object.entries(makeCount).map(([make, count]) => ({ make, count })).sort((a, b) => b.count - a.count),
  };
}

export async function getAdminServiceRemindersAction() {
  await requireAdmin();
  await connectDB();

  const { ServiceReminder } = await import('@/lib/models');
  const reminders = await ServiceReminder.find().sort({ createdAt: -1 }).limit(50).lean() as any[];

  const enriched = await Promise.all(reminders.map(async (r: any) => {
    const [u, ev] = await Promise.all([
      User.findById(r.userId).select('firstName lastName name email').lean() as any,
      EvData.findById(r.evId).select('make model').lean() as any,
    ]);
    return {
      id:        r._id.toString(),
      userName:  u ? (u.firstName ? `${u.firstName} ${u.lastName}`.trim() : u.name) : 'Unknown',
      email:     u?.email || '',
      make:      ev?.make  || '',
      model:     ev?.model || '',
      milestone: r.milestone,
      emailSent: r.emailSent,
      dismissed: r.dismissed,
      sentAt:    r.sentAt?.toISOString?.() ?? null,
    };
  }));

  return enriched;
}

export async function toggleAdminAction(targetUserId: string) {
  await requireAdmin();
  await connectDB();
  const target = await User.findById(targetUserId).lean() as any;
  if (!target) return { error: 'User not found' };
  await User.findByIdAndUpdate(targetUserId, { isAdmin: !target.isAdmin });
  revalidatePath('/admin');
  return { success: true };
}

export async function makeAdminBySecretAction(secret: string) {
  if (secret !== process.env.ADMIN_SECRET) return { error: 'Invalid secret' };
  const user = await getUser();
  if (!user) return { error: 'Not logged in' };
  await connectDB();
  await User.findByIdAndUpdate(user.id, { isAdmin: true });
  revalidatePath('/dashboard');
  return { success: true };
}


// ========================================================
// SERVICE TRACKING — per-car remaining km, history, exec actions
// ========================================================

// ── Calculate remaining km to next service for a given car ───────────────────
export async function getCarServiceStatusAction(evId: string) {
  const user = await getUser();
  if (!user) return null;
  await connectDB();

  const { ServiceRecord } = await import('@/lib/models');

  // Get all trips for this car to sum total odometer
  const trips = await Trip.find({ evId }).lean() as any[];
  const totalKm = trips.reduce((acc: number, t: any) => acc + ((t.distance || 0) * 1.60934), 0);

  // Get the last completed service record for this car
  const lastService = await ServiceRecord.findOne({ evId }).sort({ servicedAt: -1 }).lean() as any;
  const lastServiceKm = lastService?.odometerKm ?? 0;
  const lastServiceMilestone = lastService?.milestone ?? 0;

  // Get EV make/model for threshold lookup
  const ev = await EvData.findById(evId).lean() as any;
  if (!ev) return null;

  const { getServiceThresholds, getBookingUrl } = await import('@/lib/serviceReminder');
  const thresholds = getServiceThresholds(ev.make);

  // Find next threshold ABOVE lastServiceKm
  const kmSinceLastService = totalKm - lastServiceKm;
  const nextThresholdOffset = thresholds[0]; // interval (e.g. 15000 km)
  const nextServiceAt = lastServiceKm + nextThresholdOffset;
  const remainingKm = Math.max(0, nextServiceAt - totalKm);
  const progressPct = Math.min(100, (kmSinceLastService / nextThresholdOffset) * 100);
  const isDue = remainingKm === 0;

  // All service records for this car
  const history = await ServiceRecord.find({ evId }).sort({ servicedAt: -1 }).lean() as any[];

  return {
    evId:                evId,
    make:                ev.make,
    model:               ev.model,
    nickname:            ev.nickname || '',
    totalKm:             Math.round(totalKm),
    lastServiceKm:       Math.round(lastServiceKm),
    lastServiceDate:     lastService?.servicedAt?.toISOString?.() ?? null,
    nextServiceAt:       Math.round(nextServiceAt),
    remainingKm:         Math.round(remainingKm),
    kmSinceLastService:  Math.round(kmSinceLastService),
    progressPct:         Math.round(progressPct),
    isDue,
    bookingUrl:          getBookingUrl(ev.make),
    serviceHistory:      history.map((h: any) => ({
      id:          h._id.toString(),
      odometerKm:  h.odometerKm,
      milestone:   h.milestone,
      notes:       h.notes,
      servicedAt:  h.servicedAt?.toISOString?.() ?? null,
    })),
  };
}

// ── Get service status for ALL cars of current user (dashboard) ──────────────
export async function getAllCarsServiceStatusAction() {
  const user = await getUser();
  if (!user) return [];
  await connectDB();

  const cars = await EvData.find({ userId: user.id }).lean() as any[];
  const statuses = await Promise.all(cars.map((c: any) => getCarServiceStatusAction(c._id.toString())));
  return statuses.filter(Boolean);
}

// ── Admin: get service status for ALL cars across all users ──────────────────
export async function getAdminAllCarsServiceAction() {
  await requireAdmin();
  await connectDB();

  const { ServiceRecord } = await import('@/lib/models');
  const allCars = await EvData.find().lean() as any[];

  const results = await Promise.all(allCars.map(async (ev: any) => {
    const trips = await Trip.find({ evId: ev._id }).lean() as any[];
    const totalKm = trips.reduce((acc: number, t: any) => acc + ((t.distance || 0) * 1.60934), 0);
    const lastService = await ServiceRecord.findOne({ evId: ev._id }).sort({ servicedAt: -1 }).lean() as any;
    const lastServiceKm = lastService?.odometerKm ?? 0;

    const { getServiceThresholds } = await import('@/lib/serviceReminder');
    const thresholds = getServiceThresholds(ev.make);
    const interval = thresholds[0];
    const nextServiceAt = lastServiceKm + interval;
    const remainingKm = Math.max(0, nextServiceAt - totalKm);
    const progressPct = Math.min(100, ((totalKm - lastServiceKm) / interval) * 100);

    // Get owner name
    const owner = await User.findById(ev.userId).select('firstName lastName name email').lean() as any;
    const ownerName = owner ? (owner.firstName ? `${owner.firstName} ${owner.lastName}`.trim() : owner.name) : 'Unknown';

    return {
      evId:           ev._id.toString(),
      make:           ev.make,
      model:          ev.model,
      nickname:       ev.nickname || '',
      ownerName,
      ownerEmail:     owner?.email || '',
      totalKm:        Math.round(totalKm),
      lastServiceKm:  Math.round(lastServiceKm),
      lastServiceDate: lastService?.servicedAt?.toISOString?.() ?? null,
      nextServiceAt:  Math.round(nextServiceAt),
      remainingKm:    Math.round(remainingKm),
      progressPct:    Math.round(progressPct),
      isDue:          remainingKm === 0,
    };
  }));

  return results.sort((a: any, b: any) => a.remainingKm - b.remainingKm); // most urgent first
}

// ── Service Exec: mark a service as completed ─────────────────────────────────
// Only users with isServiceExec=true can call this
export async function markServiceCompletedAction(
  evId: string,
  notes: string,
  execPin: string
) {
  // Verify exec PIN matches env secret
  if (execPin !== (process.env.SERVICE_EXEC_PIN || 'Nainil')) {
    return { error: 'Invalid service executive PIN' };
  }

  const user = await getUser();
  if (!user) return { error: 'Not logged in' };

  await connectDB();

  // Check user has service exec role OR admin
  const fullUser = await User.findById(user.id).select('isServiceExec isAdmin').lean() as any;
  if (!fullUser?.isServiceExec && !fullUser?.isAdmin) {
    return { error: 'Access denied — service executive role required' };
  }

  const { ServiceRecord } = await import('@/lib/models');

  // Get current total km for this car
  const trips = await Trip.find({ evId }).lean() as any[];
  const totalKm = trips.reduce((acc: number, t: any) => acc + ((t.distance || 0) * 1.60934), 0);

  const ev = await EvData.findById(evId).lean() as any;
  if (!ev) return { error: 'Vehicle not found' };

  const { getServiceThresholds } = await import('@/lib/serviceReminder');
  const thresholds = getServiceThresholds(ev.make);
  const interval = thresholds[0];
  const currentMilestone = Math.floor(totalKm / interval) * interval;

  // Record the service
  await ServiceRecord.create({
    evId,
    userId:     ev.userId,
    odometerKm: Math.round(totalKm),
    milestone:  currentMilestone || interval,
    notes:      notes || 'Service completed',
    servicedBy: user.id,
    servicedAt: new Date(),
  });

  // Dismiss any active service reminder for this car
  const { ServiceReminder } = await import('@/lib/models');
  await ServiceReminder.updateMany(
    { evId, dismissed: false },
    { dismissed: true, dismissedAt: new Date() }
  );

  revalidatePath('/dashboard');
  revalidatePath('/admin');
  return { success: true, odometerKm: Math.round(totalKm) };
}

// ── Admin: toggle service exec role ──────────────────────────────────────────
export async function toggleServiceExecAction(targetUserId: string) {
  await requireAdmin();
  await connectDB();
  const target = await User.findById(targetUserId).lean() as any;
  if (!target) return { error: 'User not found' };
  await User.findByIdAndUpdate(targetUserId, { isServiceExec: !target.isServiceExec });
  revalidatePath('/admin');
  return { success: true, isServiceExec: !target.isServiceExec };
}


// ========================================================
// USER APPROVAL SYSTEM
// ========================================================

export async function getPendingUsersAction() {
  await requireAdmin()
  await connectDB()
  const pending = await User.find({ isApproved: false })
    .select('firstName lastName name email createdAt profilePic regAge regHealthCondition regRestInterval regCarMake regCarModel regBatteryCapacity regRangeAtFull')
    .sort({ createdAt: -1 })
    .lean() as any[]

  return pending.map((u: any) => ({
    id:                   u._id.toString(),
    name:                 u.firstName ? `${u.firstName} ${u.lastName}`.trim() : u.name,
    email:                u.email,
    joinedAt:             u.createdAt?.toISOString?.() ?? '',
    profilePic:           u.profilePic ?? null,
    regAge:               u.regAge || 0,
    regHealthCondition:   u.regHealthCondition || 'none',
    regRestInterval:      u.regRestInterval || 120,
    regCarMake:           u.regCarMake || '',
    regCarModel:          u.regCarModel || '',
    regBatteryCapacity:   u.regBatteryCapacity || 0,
    regRangeAtFull:       u.regRangeAtFull || 0,
  }))
}

export async function approveUserAction(targetUserId: string) {
  await requireAdmin()
  await connectDB()

  const target = await User.findById(targetUserId)
    .select('name firstName lastName email isApproved')
    .lean() as any
  if (!target) return { error: 'User not found' }
  if (target.isApproved) return { error: 'User already approved' }

  await User.findByIdAndUpdate(targetUserId, { isApproved: true })

  const userName  = target.firstName
    ? `${target.firstName} ${target.lastName}`.trim()
    : target.name

  // Send approval email to the user
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from:    process.env.RESEND_FROM || 'OptiRange <onboarding@resend.dev>',
      to:      target.email,
      subject: '🎉 Your OptiRange Account Has Been Approved!',
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#1e293b;padding:12px 24px;border-radius:16px;border:1px solid #334155;">
        <span style="color:#3b82f6;font-size:22px;">⚡</span>
        <span style="color:#f1f5f9;font-size:22px;font-weight:900;">OptiRange</span>
      </div>
    </div>

    <div style="background:linear-gradient(135deg,#10b98122,#3b82f622);border:1px solid #10b98144;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
      <div style="font-size:52px;margin-bottom:12px;">🎉</div>
      <h1 style="color:#10b981;margin:0 0 8px;font-size:26px;font-weight:900;">Congratulations!</h1>
      <p style="color:#6ee7b7;margin:0;font-size:16px;">Your account has been approved</p>
    </div>

    <div style="background:#1e293b;border-radius:16px;padding:28px;border:1px solid #334155;margin-bottom:24px;">
      <p style="color:#e2e8f0;margin:0 0 16px;font-size:16px;">Hi ${userName},</p>
      <p style="color:#cbd5e1;margin:0 0 20px;font-size:15px;line-height:1.6;">
        Welcome to <strong style="color:#f1f5f9;">OptiRange AI</strong> — your intelligent EV trip planning companion.
        Your account has been reviewed and approved by our team. You can now log in and start planning smarter, greener journeys.
      </p>

      <div style="background:#0f172a;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #334155;">
        <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">What you can do now:</p>
        <p style="color:#cbd5e1;font-size:14px;margin:4px 0;">⚡ Plan EV trips with real charging station data</p>
        <p style="color:#cbd5e1;font-size:14px;margin:4px 0;">🧠 Get ML-powered range predictions</p>
        <p style="color:#cbd5e1;font-size:14px;margin:4px 0;">🗺️ Navigate with 3D live maps</p>
        <p style="color:#cbd5e1;font-size:14px;margin:4px 0;">🔧 Track your vehicle service milestones</p>
        <p style="color:#cbd5e1;font-size:14px;margin:4px 0;">❤️ Health-aware rest stops along your route</p>
      </div>

      <div style="text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login"
          style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;padding:14px 40px;border-radius:14px;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:-0.3px;">
          🚀 Log In to OptiRange
        </a>
      </div>
    </div>

    <div style="text-align:center;color:#475569;font-size:13px;">
      <p style="margin:0;">Welcome to the OptiRange community — drive smarter, charge better.</p>
    </div>
  </div>
</body>
</html>`,
    })
  } catch (err) {
    console.error('[Approval] User approval email failed:', err)
  }

  revalidatePath('/admin')
  return { success: true, userName }
}

export async function rejectUserAction(targetUserId: string) {
  await requireAdmin()
  await connectDB()

  const target = await User.findById(targetUserId)
    .select('name firstName lastName email')
    .lean() as any
  if (!target) return { error: 'User not found' }

  // Send rejection email
  const userName = target.firstName
    ? `${target.firstName} ${target.lastName}`.trim()
    : target.name

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from:    process.env.RESEND_FROM || 'OptiRange <onboarding@resend.dev>',
      to:      target.email,
      subject: 'OptiRange — Registration Update',
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <span style="color:#3b82f6;font-size:22px;font-weight:900;">⚡ OptiRange</span>
    </div>
    <div style="background:#1e293b;border-radius:16px;padding:28px;border:1px solid #334155;">
      <p style="color:#e2e8f0;margin:0 0 12px;font-size:16px;">Hi ${userName},</p>
      <p style="color:#cbd5e1;margin:0 0 16px;font-size:15px;line-height:1.6;">
        Thank you for registering with OptiRange. After review, we are unable to approve your account at this time.
      </p>
      <p style="color:#cbd5e1;margin:0;font-size:15px;">
        If you believe this is an error, please contact our support team.
      </p>
    </div>
  </div>
</body>
</html>`,
    })
  } catch {}

  // Delete the rejected user
  await User.findByIdAndDelete(targetUserId)

  revalidatePath('/admin')
  return { success: true }
}