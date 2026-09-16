import { StoreArticle } from '@/components/StoreArticle';

export default function FaqPage() {
  return (
    <StoreArticle title="FAQ">
      <p>
        <strong className="text-slate-900">How do I order?</strong>
        <br />
        Add products to your cart, enter your details, and tap Pay. We save the order and open WhatsApp so you can
        complete payment with our team.
      </p>
      <p>
        <strong className="text-slate-900">How do I pay?</strong>
        <br />
        Payment is arranged on WhatsApp (0115 970 558). After we confirm payment, your order is marked paid.
      </p>
      <p>
        <strong className="text-slate-900">Will I get email updates?</strong>
        <br />
        Yes, if you enter a real email at checkout. We send mail when payment is confirmed, when the order is out for
        delivery, and when it is delivered.
      </p>
      <p>
        <strong className="text-slate-900">Where are you located?</strong>
        <br />
        Nairobi CBD, Mithoo Business Centre, 3rd floor T54, along Moi Avenue, opposite The Baazar Building.
      </p>
    </StoreArticle>
  );
}
