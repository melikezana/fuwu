"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type UserType = "Müşteri" | "Usta";

type WaitlistFormState = {
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  userType: UserType | "";
  district: string;
};

type WaitlistField = keyof WaitlistFormState;
type WaitlistFormErrors = Partial<Record<WaitlistField, string>>;
type SubmittedWaitlistEntry = {
  accessCode: string;
};

const initialFormState: WaitlistFormState = {
  fullName: "",
  emailAddress: "",
  phoneNumber: "",
  userType: "",
  district: "",
};

const fieldLabels: Record<WaitlistField, string> = {
  fullName: "Ad soyad",
  emailAddress: "E-posta adresi",
  phoneNumber: "Telefon numarası",
  userType: "Kullanıcı tipi",
  district: "İlçe",
};

const requiredFields: WaitlistField[] = ["fullName", "emailAddress", "userType"];

const userTypeOptions: Array<{
  value: UserType;
  description: string;
}> = [
  {
    value: "Müşteri",
    description: "Güvenilir ustalara daha hızlı ulaşmak istiyorum.",
  },
  {
    value: "Usta",
    description: "Fuwu’da görünür olup talep almak istiyorum.",
  },
];

const fieldClassName =
  "mt-2 w-full cursor-text rounded-md border border-[var(--border)] bg-white px-3.5 py-3 text-sm text-[var(--brand-navy)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange-soft)]";

const labelClassName = "block cursor-default select-none text-sm font-bold text-[var(--brand-navy)]";
const helperClassName = "mt-1.5 cursor-default select-none text-xs leading-5 text-[var(--muted)]";
const errorClassName = "mt-2 cursor-default select-none text-sm font-bold text-red-600";

function createAccessCode() {
  return `ERKEN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeForm(values: WaitlistFormState): WaitlistFormState {
  return {
    fullName: values.fullName.trim(),
    emailAddress: values.emailAddress.trim().toLowerCase(),
    phoneNumber: values.phoneNumber.trim(),
    userType: values.userType,
    district: values.district.trim(),
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateForm(values: WaitlistFormState) {
  const errors: WaitlistFormErrors = {};

  requiredFields.forEach((field) => {
    if (!values[field].trim()) {
      errors[field] = `Lütfen ${fieldLabels[field].toLocaleLowerCase("tr")} bilgisini girin.`;
    }
  });

  if (values.emailAddress && !isValidEmail(values.emailAddress)) {
    errors.emailAddress = "Lütfen geçerli bir e-posta adresi girin.";
  }

  const phoneDigits = values.phoneNumber.replace(/\D/g, "");

  if (values.phoneNumber && phoneDigits.length < 10) {
    errors.phoneNumber = "Lütfen en az 10 haneli bir telefon numarası girin veya alanı boş bırakın.";
  }

  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className={errorClassName} id={id} role="alert">
      {message}
    </p>
  );
}

export function WaitlistForm() {
  const [formState, setFormState] = useState<WaitlistFormState>(initialFormState);
  const [errors, setErrors] = useState<WaitlistFormErrors>({});
  const [submittedEntry, setSubmittedEntry] = useState<SubmittedWaitlistEntry | null>(null);

  function updateField(field: WaitlistField, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setSubmittedEntry(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEntry = normalizeForm(formState);
    const validationErrors = validateForm(normalizedEntry);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmittedEntry(null);
      return;
    }

    setErrors({});
    setSubmittedEntry({
      accessCode: createAccessCode(),
    });
    setFormState(initialFormState);
  }

  function getFieldClassName(field: WaitlistField) {
    return cn(
      fieldClassName,
      errors[field] && "border-red-500 focus:border-red-500 focus:ring-red-100",
    );
  }

  return (
    <Card className="min-w-0">
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <div className="select-none border-b border-[var(--border)] pb-5">
          <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
            Erken erişim
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--brand-navy)]">
            Talebini oluştur, Fuwu seni doğru yola yönlendirsin.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Müşteriysen hizmet ihtiyacını, ustaysan çalışma bölgeni netleştir.
          </p>
          <p className="mt-3 rounded-md border border-[rgba(255,138,0,0.24)] bg-[var(--brand-orange-soft)] px-4 py-3 text-sm font-bold leading-6 text-[var(--brand-navy)]">
            Örnek form: Bu form yalnızca tarayıcı içinde doğrulanır. Bilgiler sunucuya gönderilmez,
            veritabanına kaydedilmez ve gerçek erken erişim kaydı oluşturmaz.
          </p>
        </div>

        {submittedEntry ? (
          <div
            aria-live="polite"
            className="select-none overflow-hidden rounded-lg border border-[var(--brand-orange)] bg-[var(--brand-navy)] text-white shadow-[0_22px_60px_rgba(13,20,36,0.26)]"
          >
            <div className="h-1 bg-[var(--brand-orange)]" />
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-[var(--brand-orange)]">
                    Erken erişime hoş geldiniz
                  </p>
                  <h3 className="mt-2 text-2xl font-bold leading-tight">
                    Bilgilerin alındı. Fuwu’ya hazırsın.
                  </h3>
                </div>
                <div className="w-fit rounded-md bg-white px-3 py-2 text-xs font-bold text-[var(--brand-navy)]">
                  {submittedEntry.accessCode}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Bu gönderim gerçek erken erişim kaydı oluşturmaz; veriler sunucuya aktarılmadı ve
                kaydedilmedi. Kod yalnızca ekrandaki örnek onay içindir.
              </p>
              <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Veri durumu
                  </dt>
                  <dd className="mt-1 text-sm font-bold">Kaydedilmedi</dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Bağlantı
                  </dt>
                <dd className="mt-1 text-sm font-bold">Sistem bağlantısı yok</dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Kimlik
                  </dt>
                  <dd className="mt-1 text-sm font-bold">Giriş yapılmadı</dd>
                </div>
                <div className="rounded-md bg-white/5 p-3">
                  <dt className="text-xs font-bold uppercase tracking-normal text-white/50">
                    Durum
                  </dt>
                  <dd className="mt-1 text-sm font-bold text-[var(--brand-orange)]">
                    Öncelikli hizmet talebi
                  </dd>
                </div>
              </dl>
              <p className="mt-5 rounded-md border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/70">
                Canlı erken erişim kaydı şu an alınmıyor. Sorular için Fuwu ekibine e-posta
                gönderebilirsin.
              </p>
            </div>
          </div>
        ) : null}

        <fieldset className="space-y-5">
          <legend>
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              İletişim
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              Size nereden ulaşalım?
            </span>
          </legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="waitlistFullName">
                Ad soyad
              </label>
              <input
                aria-describedby={
                  errors.fullName ? "waitlistFullName-error" : "waitlistFullName-helper"
                }
                aria-invalid={Boolean(errors.fullName)}
                autoComplete="name"
                className={getFieldClassName("fullName")}
                id="waitlistFullName"
                name="fullName"
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="Adınızı ve soyadınızı yazın"
                required
                type="text"
                value={formState.fullName}
              />
              <p className={helperClassName} id="waitlistFullName-helper">
                Açılış güncellemelerinde kullanılacak adı yazın.
              </p>
              <FieldError id="waitlistFullName-error" message={errors.fullName} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="waitlistEmailAddress">
                E-posta adresi
              </label>
              <input
                aria-describedby={
                  errors.emailAddress
                    ? "waitlistEmailAddress-error"
                    : "waitlistEmailAddress-helper"
                }
                aria-invalid={Boolean(errors.emailAddress)}
                autoComplete="email"
                className={getFieldClassName("emailAddress")}
                id="waitlistEmailAddress"
                inputMode="email"
                name="emailAddress"
                onChange={(event) => updateField("emailAddress", event.target.value)}
                placeholder="siz@ornek.com"
                required
                type="email"
                value={formState.emailAddress}
              />
              <p className={helperClassName} id="waitlistEmailAddress-helper">
                Fuwu erken erişim güncellemeleri için bu adresi kullanır.
              </p>
              <FieldError id="waitlistEmailAddress-error" message={errors.emailAddress} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="waitlistPhoneNumber">
                Telefon numarası{" "}
                <span className="font-normal text-[var(--muted)]">(isteğe bağlı)</span>
              </label>
              <input
                aria-describedby={
                  errors.phoneNumber ? "waitlistPhoneNumber-error" : "waitlistPhoneNumber-helper"
                }
                aria-invalid={Boolean(errors.phoneNumber)}
                autoComplete="tel"
                className={getFieldClassName("phoneNumber")}
                id="waitlistPhoneNumber"
                inputMode="tel"
                name="phoneNumber"
                onChange={(event) => updateField("phoneNumber", event.target.value)}
                placeholder="+90 5xx xxx xx xx"
                type="tel"
                value={formState.phoneNumber}
              />
              <p className={helperClassName} id="waitlistPhoneNumber-helper">
                Telefonla öncelikli açılış dönüşü isterseniz ekleyin.
              </p>
              <FieldError id="waitlistPhoneNumber-error" message={errors.phoneNumber} />
            </div>

            <div>
              <label className={labelClassName} htmlFor="waitlistDistrict">
                İlçe <span className="font-normal text-[var(--muted)]">(isteğe bağlı)</span>
              </label>
              <input
                aria-describedby="waitlistDistrict-helper"
                autoComplete="address-level2"
                className={getFieldClassName("district")}
                id="waitlistDistrict"
                name="district"
                onChange={(event) => updateField("district", event.target.value)}
                placeholder="Örn. Kadıköy"
                type="text"
                value={formState.district}
              />
              <p className={helperClassName} id="waitlistDistrict-helper">
                İlçe bilgisi, bölge önceliğini netleştirmeye yardımcı olur.
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-5 border-t border-[var(--border)] pt-6">
          <legend>
            <span className="block text-xs font-bold uppercase tracking-normal text-[var(--brand-orange-dark)]">
              Erişim yolu
            </span>
            <span className="mt-1 block text-xl font-bold leading-tight text-[var(--brand-navy)]">
              Rolünüzü seçin.
            </span>
          </legend>

          <div>
            <span className={labelClassName}>Kullanıcı tipi</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {userTypeOptions.map((option) => {
                const isSelected = formState.userType === option.value;

                return (
                  <label
                    className={cn(
                      "flex min-h-28 cursor-pointer flex-col justify-between rounded-md border bg-white p-4 transition-colors",
                      isSelected
                        ? "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] shadow-[0_12px_28px_rgba(255,138,0,0.14)]"
                        : "border-[var(--border)] hover:border-[var(--brand-orange)]",
                      errors.userType && "border-red-500",
                    )}
                    key={option.value}
                  >
                    <input
                      aria-describedby={
                        errors.userType ? "waitlistUserType-error" : "waitlistUserType-helper"
                      }
                      checked={isSelected}
                      className="sr-only"
                      name="userType"
                      onChange={(event) => updateField("userType", event.target.value)}
                      required
                      type="radio"
                      value={option.value}
                    />
                    <span className="text-sm font-bold text-[var(--brand-navy)]">
                      {option.value}
                    </span>
                    <span className="mt-3 text-xs leading-5 text-[var(--muted)]">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className={helperClassName} id="waitlistUserType-helper">
              Bu seçim sana doğru başlangıç yolunu göstermemize yardımcı olur.
            </p>
            <FieldError id="waitlistUserType-error" message={errors.userType} />
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Bu gönderim gerçek kayıt oluşturmaz ve kişisel veri saklamaz.
          </p>
          <Button className="w-full sm:w-fit" type="submit">
            Talep Oluştur
          </Button>
        </div>
      </form>
    </Card>
  );
}
