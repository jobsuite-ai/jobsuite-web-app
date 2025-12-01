export type TemplateInput = {
    client: ClientInfo;
    items: TemplateDescription[];
    notes: string;
    image: string;
    discountReason?: string;
    discountPercentage?: number;
    estimateNumber: string;
    rate: number;
};

export type TemplateDescription = {
    header: string;
    price: number;
    hours?: number;
    content: string;
};

export type ClientInfo = {
    name: string;
    city: string;
    state: string;
    email: string;
    address: string;
    phone: string;
};
