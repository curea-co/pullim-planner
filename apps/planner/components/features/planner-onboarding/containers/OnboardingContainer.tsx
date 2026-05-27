import { currentPersona, getDday } from '@/lib/mock';
import OnboardingPresenter from '../presenters/OnboardingPresenter';

export default function OnboardingContainer() {
  const dday = getDday(currentPersona);
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;

  return <OnboardingPresenter ddayLabel={ddayLabel} />;
}
