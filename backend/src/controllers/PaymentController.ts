import {instance} from "../utils/Razorpay.js"
import crypto from "crypto";


class PaymentController {
    // Redeem a Discount
    static async checkout(req, res) {
        try {
            const  order = await instance.orders.create({
                amount: 10000,
                currency: "INR",
                receipt: "receipt#1",
                notes: {
                    key1: "value3",
                    key2: "value2"
                }
                })        
                
                return res.status(200).json({
                    message: ['Order created Successfully.'],
                    succeeded: true,
                    data: {
                        order
                    }
                });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to make payment'] });
        }

    }

    static async paymentVerification(req,res){

        try {
            const {razorpay_order_id,razorpay_payment_id,razorpay_signature} = req.body;

            const body = razorpay_order_id + "|" + razorpay_payment_id;

            const expectedSignature = crypto.createHmac('sha256',process.env.RAZORPAY_SECRET).update(body.toString()).digest('hex');

            if(expectedSignature === razorpay_signature){
                return res.status(200).json({
                    message: ['verify payment Successfully.'],
                    succeeded: true,
                    data: {
                        "signatureValid":true
                    }
                });
            }

            // data to be saved in the backend we have to work here after frontend integration

            return res.status(200).json({
                message: ['verify payment Unsuccessfully.'],
                succeeded: true,
                data: {
                    "signatureValid":true
                }
            }); 


        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to verify payment'] });
        }
    }
}

export default PaymentController;   