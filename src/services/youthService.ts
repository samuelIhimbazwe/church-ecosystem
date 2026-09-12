import {
  YOUTH_GROUPS,
  YOUTH_MEETINGS,
  YOUTH_MEMBERS,
} from '../data/youthSeed';
import type {
  YouthGroup,
  YouthGroupMember,
  YouthMeeting,
} from '../domain/types';
import { peopleService } from './authService';

export const youthService = {
  listGroups(filter?: { status?: YouthGroup['status'] }): YouthGroup[] {
    return YOUTH_GROUPS.filter((g) =>
      filter?.status ? g.status === filter.status : true,
    );
  },

  getGroup(id: string): YouthGroup | null {
    return YOUTH_GROUPS.find((g) => g.id === id) ?? null;
  },

  membersForGroup(groupId: string, activeOnly = true): YouthGroupMember[] {
    return YOUTH_MEMBERS.filter(
      (m) =>
        m.groupId === groupId && (activeOnly ? m.status === 'ACTIVE' : true),
    );
  },

  groupCards() {
    return this.listGroups().map((group) => {
      const members = this.membersForGroup(group.id);
      return {
        group,
        memberCount: members.filter((m) => m.role === 'MEMBER').length,
        mentorCount: members.filter(
          (m) => m.role === 'MENTOR' || m.role === 'LEADER',
        ).length,
        people: members.map((m) => ({
          ...m,
          name:
            peopleService.getById(m.personId)?.preferredName ||
            peopleService.getById(m.personId)?.fullName ||
            m.personId,
        })),
      };
    });
  },

  listMeetings(filter?: { groupId?: string }): YouthMeeting[] {
    return YOUTH_MEETINGS.filter((m) =>
      filter?.groupId ? m.groupId === filter.groupId : true,
    ).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },

  upcomingMeetings(now = new Date()): YouthMeeting[] {
    return this.listMeetings().filter(
      (m) => new Date(m.startsAt) >= new Date(now.toDateString()),
    );
  },

  stats() {
    const activeGroups = YOUTH_GROUPS.filter((g) => g.status === 'ACTIVE');
    return {
      activeGroups: activeGroups.length,
      totalMembers: YOUTH_MEMBERS.filter((m) => m.status === 'ACTIVE').length,
      upcomingMeetings: this.upcomingMeetings().length,
    };
  },
};
