import { Schema, model, Document } from 'mongoose';

interface IWhitelistedDomain extends Document {
    domain: string; // e.g., "example.edu"
    isVerified: boolean; // Whether the domain has been manually verified
    lastChecked: Date; // Last time the domain was checked
}

const WhitelistedDomainSchema = new Schema({
    domain: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    lastChecked: { type: Date, default: Date.now }
});

export const WhitelistedDomainModel = model<IWhitelistedDomain>('WhitelistedDomain', WhitelistedDomainSchema);