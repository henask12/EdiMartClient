"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PAYMENT_METHODS, methodHasReference, type PaymentMethod } from "@/lib/payment-methods";

type Props = {
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  reference: string;
  onReferenceChange: (reference: string) => void;
};

export const PaymentMethodField = ({ method, onMethodChange, reference, onReferenceChange }: Props) => (
  <div className="space-y-3">
    <Select
      label="Payment method"
      value={method}
      onChange={(e) => onMethodChange(e.target.value as PaymentMethod)}
    >
      {PAYMENT_METHODS.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </Select>
    {methodHasReference(method) ? (
      <Input
        label="Transaction ID (optional)"
        value={reference}
        maxLength={120}
        onChange={(e) => onReferenceChange(e.target.value)}
      />
    ) : null}
  </div>
);
