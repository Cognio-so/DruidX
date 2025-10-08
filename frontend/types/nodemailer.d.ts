declare module 'nodemailer' {
  interface Transporter {
    sendMail(mailOptions: any): Promise<any>;
  }
  
  interface CreateTransportOptions {
    service?: string;
    auth?: {
      user: string;
      pass: string;
    };
  }
  
  export function createTransport(options: CreateTransportOptions): Transporter;
  export = nodemailer;
  
  namespace nodemailer {
    function createTransport(options: CreateTransportOptions): Transporter;
  }
}
