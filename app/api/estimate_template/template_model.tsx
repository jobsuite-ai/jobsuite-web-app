export type TemplateInput = {
    client: ClientInfo;
    items: TemplateDescription[];
    notes: string;
    image: string;
    estimateNumber: string;
};

export type TemplateDescription = {
    header: string;
    price: number;
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
