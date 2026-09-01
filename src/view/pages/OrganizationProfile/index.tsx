import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconBuildingStore,
  IconFileInvoice,
  IconPalette,
  IconPhoto,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { OrganizationProfileResult } from "@/app/entities/Entity";
import { useAuth } from "@/app/hooks/useAuth";
import { organizationProfileService } from "@/app/services/organizationProfileService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const colorRegex = /^#[0-9A-Fa-f]{6}$/;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da organizacao.").max(120),
  type: z.enum(["PF", "PJ"]),
  legalName: z.string().trim().min(1, "Informe a razao social ou nome legal.").max(160),
  tradeName: z.string().trim().max(160),
  document: z.string().trim().max(40),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail valido.")
    .max(254)
    .or(z.literal("")),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(2000),
  primaryColor: z
    .string()
    .regex(colorRegex, "Use uma cor hexadecimal, como #059669."),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function profileValues(result: OrganizationProfileResult): ProfileFormData {
  return {
    name: result.organization.name,
    type: result.organization.type,
    legalName: result.profile.legalName,
    tradeName: result.profile.tradeName ?? "",
    document: result.profile.document ?? "",
    email: result.profile.email ?? "",
    phone: result.profile.phone ?? "",
    address: result.profile.address ?? "",
    primaryColor: result.profile.primaryColor,
  };
}

function optionalText(value: string) {
  return value.trim() || null;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      resolve(value.slice(value.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function OrganizationProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeEntity, can, selectedEntityId } = useAuth();
  const canEdit = can("organization.update");
  const profileQuery = useQuery({
    queryKey: [QueryKeys.ORGANIZATION_PROFILE, selectedEntityId],
    queryFn: () => organizationProfileService.get(selectedEntityId!),
    enabled: Boolean(selectedEntityId),
  });
  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      type: "PJ",
      legalName: "",
      tradeName: "",
      document: "",
      email: "",
      phone: "",
      address: "",
      primaryColor: "#059669",
    },
  });

  useEffect(() => {
    if (profileQuery.data) reset(profileValues(profileQuery.data));
  }, [profileQuery.data, reset]);

  const refreshProfile = async (result?: OrganizationProfileResult) => {
    if (result) reset(profileValues(result));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [QueryKeys.ME] }),
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.ORGANIZATION_PROFILE, selectedEntityId],
      }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: organizationProfileService.update,
  });
  const uploadMutation = useMutation({
    mutationFn: organizationProfileService.uploadLogo,
  });
  const removeMutation = useMutation({
    mutationFn: organizationProfileService.removeLogo,
  });

  const saveProfile = handleSubmit(async (formData) => {
    if (!selectedEntityId) return;

    try {
      const result = await updateMutation.mutateAsync({
        entityId: selectedEntityId,
        name: formData.name.trim(),
        type: formData.type,
        legalName: formData.legalName.trim(),
        tradeName: optionalText(formData.tradeName),
        document: optionalText(formData.document),
        email: optionalText(formData.email),
        phone: optionalText(formData.phone),
        address: optionalText(formData.address),
        primaryColor: formData.primaryColor,
      });
      await refreshProfile(result);
      toast.success("Perfil comercial atualizado.");
    } catch (error) {
      treatAxiosError(error);
    }
  });

  const uploadLogo = async (file?: File) => {
    if (!file || !selectedEntityId) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
      toast.error("Use uma imagem PNG, JPEG ou WEBP.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error("A logo deve possuir no maximo 2 MB.");
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        entityId: selectedEntityId,
        fileName: file.name,
        contentType: file.type as (typeof ACCEPTED_LOGO_TYPES)[number],
        dataBase64: await fileToBase64(file),
      });
      await refreshProfile(result);
      toast.success("Nova versao da logo publicada.");
    } catch (error) {
      treatAxiosError(error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!selectedEntityId || !window.confirm("Remover a logo ativa da organizacao?")) {
      return;
    }

    try {
      const result = await removeMutation.mutateAsync(selectedEntityId);
      await refreshProfile(result);
      toast.success("Logo removida. As cotacoes emitidas foram preservadas.");
    } catch (error) {
      treatAxiosError(error);
    }
  };

  if (profileQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando perfil...</div>;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="p-6">
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-destructive">
              Nao foi possivel carregar o perfil da organizacao.
            </p>
            <Button variant="outline" onClick={() => profileQuery.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logo = profileQuery.data.profile.logo;
  const previewName = watch("tradeName") || watch("name") || "Sua empresa";
  const previewLegalName = watch("legalName") || "Razao social";
  const previewColor = colorRegex.test(watch("primaryColor"))
    ? watch("primaryColor")
    : "#059669";

  return (
    <div className="flex flex-col gap-6 px-4 py-5 lg:px-6 lg:py-7">
      <section className="relative overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] p-5 sm:p-7">
        <div className="relative max-w-3xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Identidade do tenant
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">Perfil e documentos</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Estes dados representam {activeEntity?.name} nas cotacoes e documentos.
            Cotações já emitidas mantêm a versão da marca usada na emissão.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <form onSubmit={saveProfile} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconBuildingStore className="size-5 text-emerald-400" />
                Dados comerciais
              </CardTitle>
              <CardDescription>
                O nome da organização identifica o tenant; razão social e documento
                identificam a empresa nos documentos externos.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nome da organizacao" error={errors.name?.message}>
                <Input disabled={!canEdit} {...register("name")} />
              </Field>
              <Field label="Tipo" error={errors.type?.message}>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ">Pessoa juridica</SelectItem>
                        <SelectItem value="PF">Pessoa fisica</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Razao social ou nome legal" error={errors.legalName?.message}>
                <Input disabled={!canEdit} {...register("legalName")} />
              </Field>
              <Field label="Nome fantasia" error={errors.tradeName?.message}>
                <Input disabled={!canEdit} placeholder="Opcional" {...register("tradeName")} />
              </Field>
              <Field label="CNPJ ou CPF" error={errors.document?.message}>
                <Input disabled={!canEdit} placeholder="Opcional" {...register("document")} />
              </Field>
              <Field label="Telefone comercial" error={errors.phone?.message}>
                <Input disabled={!canEdit} placeholder="Opcional" {...register("phone")} />
              </Field>
              <Field label="E-mail comercial" error={errors.email?.message}>
                <Input type="email" disabled={!canEdit} placeholder="Opcional" {...register("email")} />
              </Field>
              <Field label="Cor principal" error={errors.primaryColor?.message}>
                <Controller
                  control={control}
                  name="primaryColor"
                  render={({ field }) => (
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        className="h-10 w-16 p-1"
                        disabled={!canEdit}
                        {...field}
                      />
                      <Input
                        className="uppercase"
                        disabled={!canEdit}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </Field>
              <Field label="Endereco completo" error={errors.address?.message} className="md:col-span-2">
                <Textarea rows={4} disabled={!canEdit} placeholder="Opcional" {...register("address")} />
              </Field>
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" isLoading={updateMutation.isPending} disabled={!isDirty}>
                Salvar perfil comercial
              </Button>
            </div>
          )}
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconPhoto className="size-5 text-emerald-400" />
                Logo da organizacao
              </CardTitle>
              <CardDescription>
                PNG, JPEG ou WEBP com até 2 MB. Cada alteração cria uma versão
                imutável para preservar documentos antigos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed bg-muted/10 p-6">
                {logo ? (
                  <img src={logo.url} alt={`Logo de ${previewName}`} className="max-h-28 max-w-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <IconPhoto className="mx-auto mb-2 size-8" />
                    <p className="text-sm">Nenhuma logo ativa</p>
                  </div>
                )}
              </div>
              {logo && (
                <p className="text-xs text-muted-foreground">
                  Versao {logo.version} - {logo.fileName}
                </p>
              )}
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => uploadLogo(event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={uploadMutation.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload />
                    {logo ? "Trocar logo" : "Enviar logo"}
                  </Button>
                  {logo && (
                    <Button
                      type="button"
                      variant="outline"
                      isLoading={removeMutation.isPending}
                      onClick={removeLogo}
                    >
                      <IconTrash />
                      Remover ativa
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconFileInvoice className="size-5 text-emerald-400" />
                Preview do documento
              </CardTitle>
              <CardDescription>Uma aproximação do cabeçalho usado nos PDFs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border bg-white text-slate-950 shadow-2xl shadow-black/20">
                <div className="h-1.5" style={{ backgroundColor: previewColor }} />
                <div className="space-y-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {logo ? (
                        <img src={logo.url} alt="" className="size-12 shrink-0 object-contain" />
                      ) : (
                        <div
                          className="flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                          style={{ backgroundColor: previewColor }}
                        >
                          {previewName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold">{previewName}</p>
                        <p className="truncate text-xs text-slate-500">{previewLegalName}</p>
                        <p className="text-xs text-slate-500">{watch("document") || "Documento nao informado"}</p>
                      </div>
                    </div>
                    <IconPalette className="size-5 shrink-0" style={{ color: previewColor }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-100 p-3">Produtos cotados</div>
                    <div className="rounded-lg bg-slate-100 p-3 text-right font-bold">R$ 0,00</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
