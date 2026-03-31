import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import { toast } from "sonner";

import { QueryKeys } from "@/app/config/QueryKeys";
import type { Contact } from "@/app/entities/Contact";
import { useAuth } from "@/app/hooks/useAuth";
import { useContacts } from "@/app/hooks/useContacts";
import { contactService } from "@/app/services/contactService";
import { treatAxiosError } from "@/app/utils/treatAxiosError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContactModal } from "@/view/modals/ContactModal";

export default function Contacts() {
  const { selectedEntityId } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [contactBeingEdited, setContactBeingEdited] =
    useState<Contact.Attributes | null>(null);

  const { contacts, isFetchingContacts } = useContacts(
    {
      entityId: selectedEntityId!,
    },
    Boolean(selectedEntityId)
  );

  const { isPending: isDeleting, mutateAsync: deleteContact } = useMutation({
    mutationFn: contactService.remove,
  });

  const contactsWithEmail = useMemo(
    () => contacts?.filter((contact) => Boolean(contact.email)).length ?? 0,
    [contacts]
  );

  const contactsWithPhone = useMemo(
    () => contacts?.filter((contact) => Boolean(contact.phone)).length ?? 0,
    [contacts]
  );

  const handleDeleteContact = async (contact: Contact.Attributes) => {
    if (!selectedEntityId || !contact.id) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja excluir o contato "${contact.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteContact({
        entityId: selectedEntityId,
        contactId: contact.id,
      });
      toast.success("Contato removido com sucesso!");
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.CONTACTS, selectedEntityId],
      });
    } catch (error) {
      treatAxiosError(error);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contatos</h1>
          <p className="text-muted-foreground text-sm">
            Organize clientes, fornecedores e pessoas recorrentes da entidade
            ativa para reaproveitar nas transações.
          </p>
        </div>
        <Button
          className="w-full md:w-auto"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <IconPlus className="mr-2 size-4" />
          Novo contato
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Visão rápida da entidade atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total de contatos</span>
              <strong>{contacts?.length ?? 0}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Com e-mail</span>
              <strong>{contactsWithEmail}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Com telefone</span>
              <strong>{contactsWithPhone}</strong>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:col-span-2 md:grid-cols-2">
          {isFetchingContacts && (
            <Card className="md:col-span-2">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Carregando contatos...
              </CardContent>
            </Card>
          )}

          {!isFetchingContacts && (contacts?.length ?? 0) === 0 && (
            <Card className="md:col-span-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <IconUsers className="size-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Nenhum contato cadastrado</p>
                  <p className="text-muted-foreground text-sm">
                    Cadastre contatos para reutilizar em transações e
                    recorrências.
                  </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <IconPlus className="mr-2 size-4" />
                  Criar contato
                </Button>
              </CardContent>
            </Card>
          )}

          {contacts?.map((contact) => (
            <Card key={contact.id}>
              <CardHeader>
                <CardDescription>
                  {contact.email ?? "Sem e-mail"}
                </CardDescription>
                <CardTitle>{contact.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Telefone: {contact.phone ?? "Não informado"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setContactBeingEdited(contact)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDeleteContact(contact)}
                    disabled={isDeleting}
                  >
                    <IconTrash className="mr-2 size-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <ContactModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        action="create"
      />

      <ContactModal
        isOpen={Boolean(contactBeingEdited)}
        onClose={() => setContactBeingEdited(null)}
        action="update"
        contact={contactBeingEdited}
      />
    </div>
  );
}
