declare module 'sib-api-v3-sdk' {
  export = SibApiV3Sdk;
  
  namespace SibApiV3Sdk {
    class TransactionalEmailsApi {
      constructor();
      setApiKey(type: number, key: string): void;
      sendTransacEmail(data: any): Promise<any>;
    }
    
    class ContactsApi {
      constructor();
      setApiKey(type: number, key: string): void;
      createContact(data: any): Promise<any>;
      updateContact(identifier: string, data: any): Promise<any>;
      getContactInfo(identifier: string): Promise<any>;
    }
    
    class EmailCampaignsApi {
      constructor();
      setApiKey(type: number, key: string): void;
      createEmailCampaign(data: any): Promise<any>;
      sendEmailCampaignNow(campaignId: number): Promise<any>;
    }
    
    const TransactionalEmailsApiApiKeys: {
      apiKey: number;
    };
    
    const ContactsApiApiKeys: {
      apiKey: number;
    };
    
    const EmailCampaignsApiApiKeys: {
      apiKey: number;
    };
  }
}