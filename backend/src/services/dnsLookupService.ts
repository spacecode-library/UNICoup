import dns from 'dns';

export const checkDNSRecords = async (domain: string): Promise<boolean> => {
    return new Promise((resolve) => {
        dns.resolveMx(domain, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};
