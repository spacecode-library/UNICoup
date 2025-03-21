
export enum UserRoleEnums {
    Student = 'STUDENT',
    Admin = 'ADMIN',
    Merchant = 'MERCHANT',
}


export enum AdminRoleEnums {
    Default = 'DEFAULT',
    StudentManager = 'STUDENTMANAGER',
    DiscountManager = 'DISCOUNTMANAGER',
    MerchantManager = 'MERCHANTMANAGER',
    Master = "MASTER"
}

export enum StudentStatusEnums{
    Pending = 'PENDING',
    Rejected = 'REJECTED',
    Verified = 'VERIFIED'
}


export enum MerchantStatusEnums{
    Pending = 'PENDING',
    Rejected = 'REJECTED',
    Verified = 'VERIFIED'
}

export enum DiscountTypeEnums{
    Online = 'ONLINE',
    Offline = 'OFFLINE'
}

export enum DiscountStatusEnums{
    Active = 'ACTIVE',
    Expired = 'EXPIRED',
    Disabled = 'DISABLED',
    Created = 'CREATED'
}

export enum EventStatusEnums{
    Upcoming = 'UPCOMING',
    Live = 'LIVE',
    Completed = 'COMPLETED'
}