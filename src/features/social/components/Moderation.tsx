import { useTranslation } from 'react-i18next';
import { formatUsername, type PublicProfile } from '../publicProfile';
import type { PublicRating } from '../publicRating';
import { useRemovePublicProfile, useRemovePublicRating } from '../useModeration';
import { ConfirmAction } from './ConfirmAction';

/** Admins only: removes the whole public profile (ratings and follows included). */
export function ModerationPanel({ profile }: { profile: PublicProfile }) {
  const { t } = useTranslation();
  const remove = useRemovePublicProfile(profile);
  const username = formatUsername(profile.username);

  return (
    <section
      aria-labelledby="moderation"
      className="flex flex-col gap-3 rounded-md border border-dashed border-border-strong p-4"
    >
      <h2 id="moderation" className="text-base font-bold">
        {t('social.moderation.title')}
      </h2>
      <p className="text-sm text-fg-muted">{t('social.moderation.hint')}</p>
      <ConfirmAction
        label={t('social.moderation.removeProfile')}
        accessibleLabel={t('social.moderation.removeProfileOf', { username })}
        question={t('social.moderation.removeProfileConfirm', { username })}
        pendingLabel={t('social.moderation.removing')}
        isPending={remove.isPending}
        errorText={remove.isError ? t('social.moderation.error') : null}
        onConfirm={() => remove.mutate()}
      />
    </section>
  );
}

/** Admins only: removes one public rating (the owner's private book is untouched). */
export function RemoveRatingAction({ uid, rating }: { uid: string; rating: PublicRating }) {
  const { t } = useTranslation();
  const remove = useRemovePublicRating(uid);

  return (
    <ConfirmAction
      label={t('social.moderation.removeRating')}
      accessibleLabel={t('social.moderation.removeRatingOf', { title: rating.title })}
      question={t('social.moderation.removeRatingConfirm', { title: rating.title })}
      pendingLabel={t('social.moderation.removing')}
      isPending={remove.isPending}
      errorText={remove.isError ? t('social.moderation.error') : null}
      onConfirm={() => remove.mutate(rating.bookId)}
    />
  );
}
