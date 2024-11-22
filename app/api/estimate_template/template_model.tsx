export type TemplateInput = {
    client: ClientInfo;
    items: TemplateDescription[];
    notes: string;
    estimateNumber: number;
};

export type TemplateDescription = {
    header: string;
    price: number;
    content: string;
};

type ClientInfo = {
    name: string;
    address: string;
    phone: string;
};
