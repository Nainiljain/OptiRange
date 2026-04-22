import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  firstName:  { type: String, default: '' },
  lastName:   { type: String, default: '' },
  name:       { type: String, required: true },  // legacy
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  profilePic: { type: String },
  isAdmin:       { type: Boolean, default: false },
  isServiceExec: { type: Boolean, default: false },
  isApproved:    { type: Boolean, default: false }, // admin must approve before login
  // Health snapshot from registration form — shown to admin before approval
  regHealthCondition: { type: String, default: 'none' },
  regRestInterval:    { type: Number, default: 120 },
  regAge:             { type: Number, default: 0 },
  // Car snapshot from registration
  regCarMake:         { type: String, default: '' },
  regCarModel:        { type: String, default: '' },
  regBatteryCapacity: { type: Number, default: 0 },
  regRangeAtFull:     { type: Number, default: 0 },
  createdAt:  { type: Date, default: Date.now },
});

const EvDataSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // NOTE: unique removed — one user can have multiple cars
  nickname: { type: String, default: '' }, // e.g. "Daily Driver", "Road Trip Car"
  make: { type: String },
  model: { type: String },
  batteryCapacity: { type: Number },
  currentCharge: { type: Number },
  rangeAtFull: { type: Number },
  carPic: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const HealthDataSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  age: { type: Number },
  healthCondition: { type: String },
  preferredRestInterval: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

const TripSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  evId: { type: Schema.Types.ObjectId, ref: 'EvData' }, // which car was used
  startLocation: { type: String },
  endLocation: { type: String },
  distance: { type: Number },
  estimatedTime: { type: String },
  batteryUsed: { type: Number },
  chargingStops: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export const User = models.User || model('User', UserSchema);
export const EvData = models.EvData || model('EvData', EvDataSchema);
export const HealthData = models.HealthData || model('HealthData', HealthDataSchema);
export const Trip = models.Trip || model('Trip', TripSchema);

// ── Saved Locations (Home, Work, Favourites) ──────────────────────────────────
const SavedLocationSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  label:     { type: String, required: true },       // "Home", "Work", or custom name
  type:      { type: String, default: 'favourite' }, // 'home' | 'work' | 'favourite'
  address:   { type: String, required: true },
  lat:       { type: Number, required: true },
  lon:       { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// ── Recent Searches ────────────────────────────────────────────────────────────
const RecentSearchSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  address:   { type: String, required: true },
  lat:       { type: Number, required: true },
  lon:       { type: Number, required: true },
  usedAt:    { type: Date, default: Date.now },
});

export const SavedLocation = models.SavedLocation || model('SavedLocation', SavedLocationSchema);
export const RecentSearch  = models.RecentSearch  || model('RecentSearch',  RecentSearchSchema);

// ── Service Reminders ─────────────────────────────────────────────────────────
const ServiceReminderSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  evId:       { type: Schema.Types.ObjectId, ref: 'EvData', required: true },
  milestone:  { type: Number, required: true },   // km threshold that triggered this
  emailSent:  { type: Boolean, default: false },
  sentAt:     { type: Date },
  dismissed:  { type: Boolean, default: false },
  dismissedAt:{ type: Date },
  createdAt:  { type: Date, default: Date.now },
});

export const ServiceReminder = models.ServiceReminder || model('ServiceReminder', ServiceReminderSchema);

// ── Service Records — completed services logged by service executives ──────────
const ServiceRecordSchema = new Schema({
  evId:          { type: Schema.Types.ObjectId, ref: 'EvData', required: true },
  userId:        { type: Schema.Types.ObjectId, ref: 'User',   required: true },
  odometerKm:    { type: Number, required: true },  // km at time of service
  milestone:     { type: Number, required: true },  // which threshold was serviced
  notes:         { type: String, default: '' },
  servicedBy:    { type: Schema.Types.ObjectId, ref: 'User' }, // service exec who logged it
  servicedAt:    { type: Date, default: Date.now },
  createdAt:     { type: Date, default: Date.now },
});

export const ServiceRecord = models.ServiceRecord || model('ServiceRecord', ServiceRecordSchema);

// ── Update User schema to include isServiceExec ───────────────────────────────
// (Schema already exported above — we extend it via a plugin below)
// isServiceExec is added directly to UserSchema above; this comment is a reminder.
// Run a migration or let MongoDB add the field dynamically via findByIdAndUpdate.
