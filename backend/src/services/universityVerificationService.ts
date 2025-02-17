import axios from 'axios';
import { WhitelistedDomainModel } from '../models/WhitelistedDomainModel.js';
import { checkDNSRecords } from './dnsLookupService.js';
import https from 'https';
import { chromium } from 'playwright';

/**
 * Extracts the domain from an email address.
 */
const extractDomain = (email?: string): string | null => {
    if (!email || !email.includes('@')) {
        console.error('Invalid email format:', email);
        return null;
    }
    return email.split('@')[1];
};


/**
 * Checks if the domain is already whitelisted in the database.
 */
const isDomainWhitelisted = async (domain: string): Promise<boolean> => {
    const whitelistedDomain = await WhitelistedDomainModel.findOne({ domain });
    return !!whitelistedDomain && whitelistedDomain.isVerified;
};


/**
 * Scrape the university website to verify the email domain.
 */

const MAX_RETRIES = 3;

export const scrapeUniversityWebsite = async (domain: string): Promise<boolean> => {
    let retries = 0;

    while (retries < MAX_RETRIES) {
        try {
            const url = `https://www.${domain}`;
            console.log(`Scraping URL: ${url}`);

            // Launch a new browser instance
            const browser = await chromium.launch({ headless: true });
            // Create a new context with SSL errors ignored
            const context = await browser.newContext({ ignoreHTTPSErrors: true });

            const page = await context.newPage();

            // Navigate to the website
            await page.goto(url, { waitUntil: 'networkidle' });

            // Check if the page contains the keyword "university"
            const content = await page.content();
            const hasUniversityKeyword = content.toLowerCase().includes('university');

            await browser.close();

            if (hasUniversityKeyword) {
                console.log(`Successfully verified ${domain} as a valid university domain.`);
                return true;
            }

            console.warn(`The website at ${url} does not appear to belong to a university.`);
            return false;

        } catch (error) {
            retries++;

            // Use a type guard to safely handle the error
            if (error instanceof Error) {
                console.error(`Attempt ${retries}/${MAX_RETRIES} failed for ${domain}:`, error.message);
            } else {
                console.error(`Attempt ${retries}/${MAX_RETRIES} failed for ${domain}:`, String(error));
            }

            if (retries >= MAX_RETRIES) {
                console.error(`Failed to scrape ${domain} after ${MAX_RETRIES} attempts.`);
                return false; // Return false if max retries are reached
            }

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    // Ensure the function always returns a value
    return false; // Default return if the loop exits without returning earlier
};

/**
 * Saves the domain to the whitelist if it passes verification.
 */
const saveToWhitelist = async (domain: string, isVerified: boolean): Promise<void> => {
    await WhitelistedDomainModel.updateOne(
        { domain },
        { $set: { domain, isVerified, lastChecked: new Date() } },
        { upsert: true }
    );
};

/**
 * Main function to verify if an email belongs to a legitimate university domain.
 */
export const verifyUniversityDomain = async (email: string): Promise<boolean> => {
    const domain = extractDomain(email);

    if (!domain) {
        return false; // Handle the case where the email format is invalid
    }

    // Step 1: Check if the domain is already whitelisted
    const isWhitelisted = await isDomainWhitelisted(domain);
    if (isWhitelisted) {
        return true;
    }

    // Step 2: Perform DNS lookup
    const hasValidDNS = await checkDNSRecords(domain);
    if (!hasValidDNS) {
        return false;
    }

    // Step 3: Perform web scraping
    const isUniversityWebsite = await scrapeUniversityWebsite(domain);
    if (!isUniversityWebsite) {
        return false;
    }

    // Step 4: Save the domain to the whitelist for future use
    await saveToWhitelist(domain, true);

    return true;
};
