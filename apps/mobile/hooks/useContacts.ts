import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { supabase } from '@/lib/supabase';
import type { UserPublic } from '@huddle/shared';

interface ContactMatch {
  contact: Contacts.Contact;
  huddleUser: UserPublic | null;
  phone: string;
  isOnHuddle: boolean;
}

interface ContactsState {
  contacts: ContactMatch[];
  loading: boolean;
  error: string | null;
  permissionStatus: Contacts.PermissionStatus | null;
}

interface ContactsActions {
  requestAndLoad: () => Promise<void>;
  searchContacts: (query: string) => ContactMatch[];
}

// Normalize phone to digits only for comparison
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Strip country code for US numbers
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

// E.164 format
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export function useContacts(): ContactsState & ContactsActions {
  const [contacts, setContacts] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Contacts.PermissionStatus | null>(null);

  const requestAndLoad = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status !== Contacts.PermissionStatus.GRANTED) {
        setError('Contacts permission not granted');
        setLoading(false);
        return;
      }

      // Fetch all contacts with phone numbers
      const { data: contactsData } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Image,
        ],
      });

      if (!contactsData || contactsData.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // Collect unique phones
      const phoneMap = new Map<string, Contacts.Contact>();
      const e164Phones: string[] = [];

      for (const contact of contactsData) {
        if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) continue;

        const primaryPhone = contact.phoneNumbers[0].number ?? '';
        if (!primaryPhone) continue;

        const e164 = toE164(primaryPhone);
        if (!phoneMap.has(e164)) {
          phoneMap.set(e164, contact);
          e164Phones.push(e164);
        }
      }

      if (e164Phones.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // Batch lookup against Huddle users table
      // Process in chunks of 100 to avoid URL length limits
      const CHUNK_SIZE = 100;
      const huddleUserMap = new Map<string, UserPublic>();

      for (let i = 0; i < e164Phones.length; i += CHUNK_SIZE) {
        const chunk = e164Phones.slice(i, i + CHUNK_SIZE);
        const { data: users } = await supabase
          .from('users')
          .select('id, name, avatar_url, reliability_score, never_bail_streak')
          .in('phone', chunk);

        if (users) {
          for (const user of users) {
            // Map by the raw phone stored in DB
            huddleUserMap.set(user.phone ?? '', user as UserPublic);
          }
        }

        // Also try denormalized forms
        const normalizedChunk = chunk.map(normalizePhone);
        for (const [phone, user] of huddleUserMap) {
          const normalizedDbPhone = normalizePhone(phone);
          for (const norm of normalizedChunk) {
            if (normalizedDbPhone === norm) {
              huddleUserMap.set(norm, user);
            }
          }
        }
      }

      // Build matches
      const matches: ContactMatch[] = [];
      for (const [e164, contact] of phoneMap) {
        const huddleUser = huddleUserMap.get(e164) ?? huddleUserMap.get(normalizePhone(e164)) ?? null;
        matches.push({
          contact,
          huddleUser,
          phone: e164,
          isOnHuddle: huddleUser !== null,
        });
      }

      // Sort: Huddle users first, then alphabetically
      matches.sort((a, b) => {
        if (a.isOnHuddle && !b.isOnHuddle) return -1;
        if (!a.isOnHuddle && b.isOnHuddle) return 1;
        const aName = a.contact.name ?? '';
        const bName = b.contact.name ?? '';
        return aName.localeCompare(bName);
      });

      setContacts(matches);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchContacts = useCallback((query: string): ContactMatch[] => {
    if (!query.trim()) return contacts;

    const q = query.toLowerCase();
    return contacts.filter((c) => {
      const name = (c.contact.name ?? '').toLowerCase();
      const phone = c.phone.toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [contacts]);

  return {
    contacts,
    loading,
    error,
    permissionStatus,
    requestAndLoad,
    searchContacts,
  };
}
